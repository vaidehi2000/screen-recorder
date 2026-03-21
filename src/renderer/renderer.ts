let selectedSourceId: string | null = null;
const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;

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

window.addEventListener('DOMContentLoaded', () => {
  loadSources();
});