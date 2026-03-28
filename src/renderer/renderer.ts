let refreshInterval: ReturnType<typeof setInterval> | null = null;
let currentSessionId: string | null = null;
let selectedSourceId: string | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let timeInterval: ReturnType<typeof setInterval> | null = null;
let timerSeconds: number = 0;
let webcamStream: MediaStream | null = null;
let webcamRecorder: MediaRecorder | null = null;
let webcamChunks: Blob[] = [];
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const timerDisplay = document.getElementById('timer') as HTMLParagraphElement;
const webcamToggle = document.getElementById('webcam-toggle') as HTMLInputElement;
const webcamPreview = document.getElementById('webcam-preview') as HTMLVideoElement;
const micToggle = document.getElementById('mic-toggle') as HTMLInputElement;
const systemAudioToggle = document.getElementById('system-audio-toggle') as HTMLInputElement;

function updateTimer() {
    timerSeconds++;
    const hours = Math.floor(timerSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((timerSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (timerSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}   

async function toggleWebcam() {
    if (!webcamPreview) {
        console.error('Webcam preview element not found');
        webcamToggle.checked = false;
        return;
    }

    if (webcamToggle.checked) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            webcamPreview.srcObject = webcamStream;
            webcamPreview.style.display = 'block';
            if (webcamPreview) {
                webcamPreview.srcObject = webcamStream;
                webcamPreview.style.display = 'block';
            }
        } catch (error) {
            console.error('Error accessing webcam:', error);
            webcamToggle.checked = false;
        }
    } else {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
                if (webcamPreview) {
                    webcamPreview.srcObject = null;
                    webcamPreview.style.display = 'none';
                }
        }
        webcamPreview.srcObject = null;
        webcamPreview.style.display = 'none';
    }
}


async function loadSources() {
    const sources = await window.electronAPI.getSources();
    const list = document.getElementById('sources-list');

    if (!list) return;
    list.innerHTML = '';

    sources.forEach(source => {
        const item = document.createElement('div');
        item.classList.add('source-item');

        if (source.id === selectedSourceId) {
            item.classList.add('selected');
        }

        const header = document.createElement('div');
        header.classList.add('source-item-header');

        if(source.appIcon) {
            const icon = document.createElement('img');
            icon.src = source.appIcon;
            icon.classList.add('app-icon');
            header.appendChild(icon);
        }
        const name = document.createElement('span');
        name.textContent = source.name;
        name.title = source.name;
        header.appendChild(name);

        const thumbnail = document.createElement('img');
        thumbnail.src = source.thumbnail;
        thumbnail.classList.add('thumbnail');

        item.appendChild(header);
        item.appendChild(thumbnail);

        item.addEventListener('click', () => {
            selectedSourceId = source.id;
            recordBtn.disabled = false;
            document.querySelectorAll('.source-item').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
        });
        list?.appendChild(item);
    });
}

function startRefreshingSources() {
    if (refreshInterval) return;
    refreshInterval = setInterval(async() => {
        if (mediaRecorder?.state !== 'recording') {
            await loadSources();
        }
    }, 3000);
}

async function startRecording() {
    if (!selectedSourceId) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: selectedSourceId,
                },
            } as MediaTrackConstraints,
        });

        if(micToggle.checked) {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true 
                },
                video: false 
                });
                micStream.getAudioTracks().forEach(track => stream.addTrack(track));
            } 
            catch (error) {
                let message = "";

                if (error instanceof DOMException) {
                    if (error.name === 'NotAllowedError') {
                        message = 'Microphone access was denied. Please allow access and try again.';
                    } else if (error.name === 'NotFoundError') {
                        message = 'No microphone found. Please connect a microphone and try again.';
                    } else if (error.name === 'NotReadableError') {
                        message = 'Microphone is already in use by another application. Please close that application and try again.';
                    } else {
                        message = `An error occurred while accessing the microphone: ${error.message}`;
                    }

                    const continueWithoutMic = confirm(`${message}\n\nDo you want to continue without microphone audio?`);
                    if (continueWithoutMic) {
                        micToggle.checked = false;
                    } else {
                        stream.getTracks().forEach(track => track.stop());
                        micToggle.checked = false;
                        return;
                    }
                }
            }
        }

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.start();
        if (webcamStream) {
            const combinedWebcamStream = new MediaStream([
                ...webcamStream.getVideoTracks(),
                ...stream.getAudioTracks(),
            ]);
            webcamRecorder = new MediaRecorder(combinedWebcamStream);
            webcamChunks = [];
            webcamRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    webcamChunks.push(event.data);
                }
            };
            webcamRecorder.start();
        }

        currentSessionId = await window.electronAPI.newSessionId();
        timerDisplay.textContent = '00:00:00';
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        timerSeconds = 0;
        timeInterval = setInterval(updateTimer, 1000);
        recordBtn.textContent = 'Stop';
        webcamToggle.disabled = true;
        micToggle.disabled = true;
        systemAudioToggle.disabled = true;

    } catch (error) {
        console.error('Error starting recording:', error);
        alert(`Error: ${String(error)}`);
    }
}

async function stopRecording() {
    if (!mediaRecorder) return;

    let screenSaved = false;
    let webcamSaved = false;
    let screenFilePath = '';
    let webcamFilePath = '';
    // const actualSeconds = Math.max(0, timerSeconds - 1);
    const hours = Math.floor(timerSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((timerSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (timerSeconds % 60).toString().padStart(2, '0');
    const duration = `${hours}:${minutes}:${seconds}`;
    
    const openReviewIfReady = async () => {
        if (screenSaved && (!webcamRecorder || webcamSaved)) {
            await window.electronAPI.openReviewWindow({
                filePath: screenFilePath,
                duration, 
                sessionPath: screenFilePath ? screenFilePath?.substring(0, screenFilePath.lastIndexOf('\\')) || '' : '',
                webcamPath: webcamFilePath ? webcamFilePath : '',
            });
        }
    };

    mediaRecorder.onstop = async () => {
        if(recordedChunks.length === 0) {
            alert('Recording was too short and has been discarded.');
            return;
        }

        const blob = new Blob(recordedChunks, { type: 'video/webm'});
        const buffer = await blob.arrayBuffer();

        if (currentSessionId) {
            const result = await window.electronAPI.saveRecording({
                buffer,
                type: 'screen',
                sessionId: currentSessionId,
            }); 
            if (!result.success) {
                alert(`Error saving recording: ${result.error}`);
            } else {
                screenFilePath = result.filePath || '';
                screenSaved = true;
                await openReviewIfReady();
            }
        }
    };
    if (webcamRecorder) {
        webcamRecorder.onstop = async () => {
            if(webcamChunks.length === 0) {
                return;
            }

            const webcamBlob = new Blob(webcamChunks, { type: 'video/webm' });
            const webcamBuffer = await webcamBlob.arrayBuffer();
            if (currentSessionId) {
                const webcamResult = await window.electronAPI.saveRecording({
                    buffer: webcamBuffer,
                    type: 'webcam',
                    sessionId: currentSessionId,
                });
                if (!webcamResult.success) {
                    alert(`Error saving webcam recording: ${webcamResult.error}`);
                } else {
                    webcamFilePath = webcamResult.filePath || '';
                    webcamSaved = true;
                    await openReviewIfReady();
                }
            };
        };
    }

    mediaRecorder.stop();
    webcamRecorder?.stop();
    timerSeconds = 0;
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    timerDisplay.textContent = '00:00:00';
    recordBtn.textContent = 'Record';
    recordBtn.disabled = true;
    webcamToggle.disabled = false;
    micToggle.disabled = false;
    systemAudioToggle.disabled = false; 
    webcamToggle.checked = false;
    micToggle.checked = false;
    systemAudioToggle.checked = false;

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
        webcamPreview.srcObject = null;
        webcamPreview.style.display = 'none';
    }
}

recordBtn.addEventListener('click', () => {
    if (recordBtn.textContent === 'Record') {
        startRecording();
    } else {
        stopRecording();
    }
});

webcamToggle.addEventListener('change', () => {
    toggleWebcam();
});

window.addEventListener('DOMContentLoaded', () => {
    loadSources();
    startRefreshingSources();
});

window.addEventListener('beforeunload', (e) => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
        e.preventDefault();
    }
});