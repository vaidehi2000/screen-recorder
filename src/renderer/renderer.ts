let selectedSourceId: string | null = null;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

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
    recordBtn.textContent = 'Stop';
}

async function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
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

window.addEventListener('DOMContentLoaded', () => {
  loadSources();
});