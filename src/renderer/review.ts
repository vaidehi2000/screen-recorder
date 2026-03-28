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

const screenFileName = filePath ? filePath.split(/[\\/]/).pop() || 'screen.webm': 'screen.webm';
const webcamFileName = webcamPath ? webcamPath.split(/[\\/]/).pop() || 'webcam.webm' : 'webcam.webm';
const folderName = sessionPath ? sessionPath.split(/[\\/]/).pop() || 'recording' : 'recording';

const screenFilenameEl = document.getElementById('screen-filename') as HTMLSpanElement;
const webcamFilenameEl = document.getElementById('webcam-filename') as HTMLSpanElement;
const folderNameEl = document.getElementById('folder-name') as HTMLSpanElement; 
const editScreenBtn = document.getElementById('edit-screen-btn') as HTMLButtonElement;
const editWebcamBtn = document.getElementById('edit-webcam-btn') as HTMLButtonElement;
const editFolderBtn = document.getElementById('edit-folder-btn') as HTMLButtonElement;  

let currentScreenName = screenFileName;
let currentWebcamName = webcamFileName;
let currentFolderName = folderName;
let currentSessionPath = sessionPath;
let currentWebcamPath = webcamPath;
let currentScreenPath = filePath;

screenFilenameEl.textContent = currentScreenName;
webcamFilenameEl.textContent = currentWebcamName;
folderNameEl.textContent = `${folderName}`;

durationEl.textContent = `Duration: ${duration}`;
locationEl.textContent = `Saved to: ${sessionPath}`;

if (filePath) {
    screenPreview.src = `file://${filePath}`;
    screenPreview.play();
}

if (webcamPath) {
    webcamReviewPreview.src = `file://${webcamPath}`;
    webcamReviewPreview.play();
    webCamContainer.classList.remove('hidden');
}

openFolderBtn.addEventListener('click', () => {
    if (currentSessionPath) {
        window.electronAPI.openFolder(currentSessionPath);
    }
});

discardBtn.addEventListener('click', () => {
    console.log('Discard clicked');
    console.log('Current paths:', {
        screenPath: currentScreenPath,
        webcamPath: currentWebcamPath,
        sessionPath: currentSessionPath
    });
    // window.electronAPI.closeReviewWindow({
    //     screenPath: currentScreenPath,
    //     webcamPath: currentWebcamPath
    // });
});

function makeEditable(
    spanEl: HTMLSpanElement, 
    currentName: string,
    renameFn: (oldPath: string, newName: string) => Promise<{ success: boolean; newPath?: string; error?: string }>,
    onRenamed: (newPath: string, newName: string) => void
) {
    const original = spanEl.textContent || '';
    const nameWithoutExt = currentName.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '';
    const input = document.createElement('input');
    input.classList.add('rename-input');
    input.type = 'text';
    input.value = nameWithoutExt;
    spanEl.replaceWith(input);
    input.focus();

    let finished = false;

    const finishEditing = async () => {
        if (finished) return;
        finished = true;

        console.log('finishEditing called');
        console.log('currentName:', currentName);
        console.log('nameWithoutExt:', nameWithoutExt);
        const newName = input.value.trim() || nameWithoutExt;
        console.log('newName:', newName);
        if (newName !== nameWithoutExt) {
            const result = await renameFn(currentName, newName);
            if (result.success && result.newPath) {
                onRenamed(result.newPath, newName);
                spanEl.textContent = `${newName}${original.match(/\.[^/.]+$/) || ''}`;
            }
            else {
                spanEl.textContent = original;
                alert(`Error renaming file: ${result.error || 'Unknown error'}`);
            }
        } else {
            spanEl.textContent = original;
        }
        input.replaceWith(spanEl);
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            finishEditing();
        } else if (event.key === 'Escape') {
            finished = true;
            input.replaceWith(spanEl);
            spanEl.textContent = original;
        }
    });
}

editScreenBtn.addEventListener('click', () => {
    makeEditable(
        screenFilenameEl, 
        currentScreenPath,
        (oldPath, newName) => window.electronAPI.renameFile({
            oldPath,
            newPath: newName
        }),
        (newPath, _newName) => {
            currentScreenPath = newPath;
            currentScreenName = _newName;
            screenPreview.src = `file://${newPath}`;
        }
    );
});

editWebcamBtn.addEventListener('click', () => {
    makeEditable(
        webcamFilenameEl, 
        currentWebcamPath,
        (oldPath, newName) => window.electronAPI.renameFile({
            oldPath,
            newPath: newName
        }),
        (newPath, _newName) => {
            currentWebcamPath = newPath;
            currentWebcamName = _newName;
            webcamReviewPreview.src = `file://${newPath}`;
        }
    );
});

editFolderBtn.addEventListener('click', () => {
    makeEditable(
        folderNameEl, 
        currentSessionPath, 
        (oldPath, newName) => window.electronAPI.renameFolder({
            oldPath,
            newPath: newName
        }),
        (newPath, _newName) => {
            currentScreenPath = currentScreenPath.replace(currentSessionPath, newPath);
            currentWebcamPath = currentWebcamPath? currentWebcamPath.replace(currentSessionPath, newPath) : '';
            currentSessionPath = newPath;
            locationEl.textContent = `Saved to: ${newPath}`;
            folderNameEl.textContent = `${_newName}`;
        }
    );
});