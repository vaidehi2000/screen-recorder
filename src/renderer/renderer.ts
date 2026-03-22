let selectedSourceId: string | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let timeInterval: ReturnType<typeof setInterval> | null = null;
let timerSeconds: number = 0;
let webcamStream: MediaStream | null = null;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
const timerDisplay = document.getElementById('timer') as HTMLParagraphElement;
const webcamToggle = document.getElementById('webcam-toggle') as HTMLInputElement;
const webcamPreview = document.getElementById('webcam-preview') as HTMLVideoElement;

function updateTimer() {
    timerSeconds++;
    const hours = Math.floor(timerSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const seconds = (timerSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}   

async function toggleWebcam() {
    if (webcamToggle.checked) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            webcamPreview.srcObject = webcamStream;
            webcamPreview.style.display = 'block';
        } catch (error) {
            console.error('Error accessing webcam:', error);
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

    sources.forEach(source => {
        const item = document.createElement('div');
        item.textContent = source.name;
        item.addEventListener('click', () => {
            selectedSourceId = source.id;
            recordBtn.disabled = false;
            document.querySelectorAll('.source-item').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
        });
        item.classList.add('source-item');
        list?.appendChild(item);
    });
}

async function startRecording() {
    if (!selectedSourceId) return;

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: selectedSourceId,
            },
        } as MediaTrackConstraints,
    });

    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.start();
    timerSeconds = 0;
    timerDisplay.textContent = '00:00:00';
    timeInterval = setInterval(updateTimer, 1000);
    recordBtn.textContent = 'Stop';
}

async function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    timerSeconds = 0;
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    timerDisplay.textContent = '00:00:00';
    recordBtn.textContent = 'Record';
    recordBtn.disabled = true;
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
});