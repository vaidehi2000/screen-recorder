async function loadSources() {
    const sources = await window.electronAPI.getSources();
    const list = document.getElementById('sources-list');

    sources.forEach(source => {
        const item = document.createElement('div');
        item.textContent = source.name;
        list?.appendChild(item);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  loadSources();
});