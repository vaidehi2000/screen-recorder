const durationEl = document.getElementById('duration') as HTMLParagraphElement;
const locationEl = document.getElementById('location') as HTMLParagraphElement;
const openFolderBtn = document.getElementById('open-folder-btn') as HTMLButtonElement;
const discardBtn = document.getElementById('discard-btn') as HTMLButtonElement;
const params = new URLSearchParams(window.location.search);
const filePath = params.get('path') || '';
const duration = params.get('duration') || '00:00:00';
const sessionPath = params.get('sessionPath') || '';
const webcamPath = params.get('webcamPath') || '';

const screenPreview = document.getElementById('screen-preview') as HTMLVideoElement;
const webcamReviewPreview = document.getElementById('webcam-preview') as HTMLVideoElement;
const webCamContainer = document.getElementById('webcam-container') as HTMLDivElement;

durationEl.textContent = `Duration: ${duration}`;
locationEl.textContent = `Saved to: ${sessionPath}`;

if (filePath) {
    screenPreview.src = `file://${filePath}`;
    screenPreview.play();
}

if (webcamPath) {
    webcamReviewPreview.src = `file://${webcamPath}`;
    webcamReviewPreview.play();
    webCamContainer.style.display = 'block';
}

openFolderBtn.addEventListener('click', () => {
    if (sessionPath) {
        window.electronAPI.openFolder(sessionPath);
    }
});

discardBtn.addEventListener('click', () => {
    window.electronAPI.closeReviewWindow();
});
