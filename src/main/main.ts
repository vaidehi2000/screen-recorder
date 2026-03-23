import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
        }
    });
    win.loadFile('src/renderer/index.html');
}

ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 200 },
    });

    return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
        isScreen: source.id.startsWith('screen'),
    }));
});

ipcMain.handle('new-session-id', () => {
    return crypto.randomUUID();
});

ipcMain.handle('save-recording', async (_event, { buffer, type, sessionId }) => {
    try {
        const dir = path.join(app.getPath('videos'), 'ScreenRecorder', sessionId);
        await fs.promises.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${type}-${Date.now()}.webm`);
        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        return { success: true, filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});