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
let saveLocation: string | null = null;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const timerDisplay = document.getElementById('timer') as HTMLParagraphElement;
const webcamToggle = document.getElementById('webcam-toggle') as HTMLInputElement;
const webcamPreview = document.getElementById('webcam-preview') as HTMLVideoElement;
const micToggle = document.getElementById('mic-toggle') as HTMLInputElement;
const systemAudioToggle = document.getElementById('system-audio-toggle') as HTMLInputElement;
const chooseFolderBtn = document.getElementById('choose-folder-btn') as HTMLButtonElement;
const saveLocationDisplay = document.getElementById('save-location-display') as HTMLSpanElement;
const bitrateSelect = document.getElementById('bitrate-input') as HTMLSelectElement;

chooseFolderBtn.addEventListener('click', async () => {
    const location = await window.electronAPI.chooseSaveLocation();
    if (location) {
        saveLocation = location;
        saveLocationDisplay.textContent = `Save Location: ${location}`;
    }
});

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
        } catch (error) {
            console.error('Error accessing webcam:', error);
            webcamToggle.checked = false;
        }
    } else {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
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
            audio: systemAudioToggle.checked ? {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: selectedSourceId,
                },
            } as unknown as MediaTrackConstraints : false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: selectedSourceId,
                },
            } as unknown as MediaTrackConstraints,
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
        const bitrate = parseInt(bitrateSelect.value);

        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        stream.getAudioTracks().forEach(track => {
            const source = audioContext.createMediaStreamSource(new MediaStream([track]));
            source.connect(destination);
        });
        const mixedStream = new MediaStream([
            ...stream.getVideoTracks(), 
            ...destination.stream.getAudioTracks()
        ]);
        mediaRecorder = new MediaRecorder(mixedStream, {
            videoBitsPerSecond: bitrate,
        });
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
                ...destination.stream.getAudioTracks(),
            ]);
            webcamRecorder = new MediaRecorder(combinedWebcamStream, {
                videoBitsPerSecond: bitrate,
            });
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
        bitrateSelect.disabled = true;

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
                saveLocation: saveLocation || undefined,
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
                    saveLocation: saveLocation || undefined,
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
    bitrateSelect.disabled = false;
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