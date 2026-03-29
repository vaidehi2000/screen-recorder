import { app, BrowserWindow, ipcMain, desktopCapturer, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
Ffmpeg.setFfmpegPath(ffmpegInstaller.path);
Ffmpeg.setFfprobePath(ffprobeInstaller.path);

function mergeRecordings(screenPath: string, webcamPath: string, outputPath: string, screenDimensions: { width: number; height: number }): Promise<void> {
    return new Promise((resolve, reject) => {
        Ffmpeg()
            .input(screenPath)
            .input(webcamPath)
            .complexFilter([
                '[0:v]setpts=PTS-STARTPTS[screen]',
                `[1:v]setpts=PTS-STARTPTS,scale=${Math.round(screenDimensions.width / 4)}:-2[webcam]`,
                '[screen][webcam]overlay=W-w-20:H-h-20[outv]'
            ])
            .outputOptions([
                '-map [outv]',
                '-map 0:a?',
                '-c:v libx264',
                '-c:a aac',
                '-crf 23', 
                '-preset fast',
                '-max_muxing_queue_size 1024'
            ])
            .output(outputPath)
            .on('start', () => {
                console.log('[ffmpeg] Starting merge...');
            })
            .on('stderr', (line) => {
                if (line.includes('Error')) 
                    console.error('[ffmpeg]', line); 
            })
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                console.error('[ffmpeg] Merge failed:', err);
                reject(err);
            })
            .run();
    }
)};


function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            enableBlinkFeatures: 'GetUserMedia',
        }
    });
    win.loadFile('src/renderer/index.html');
}

function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        Ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                const stream = metadata.streams.find(s => s.codec_type === 'video');
                if (stream && stream.width && stream.height) {
                    resolve({ 
                        width: stream.width || 1920, 
                        height: stream.height || 1080
                    });
                } else {
                    reject(new Error('No video stream found'));
                }
            }
        });
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

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

ipcMain.handle('save-recording', async (_event, { buffer, type, sessionId, saveLocation }) => {
    try {
        const baseDir = saveLocation || path.join(app.getPath('videos'), 'ScreenRecorder');
        const dir = path.join(baseDir, sessionId);
        await fs.promises.mkdir(dir, { recursive: true });
        const filePath = path.join(dir, `${type}-${Date.now()}.webm`);
        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        return { success: true, filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});

ipcMain.handle('rename-file', async (_event, { oldPath, newPath }) => {
    try {
        const dir = path.dirname(oldPath);
        const extension = path.extname(oldPath);
        const newFilePath = path.join(dir, `${newPath}${extension}`);
        await fs.promises.rename(oldPath, newFilePath);
        return { success: true, newPath: newFilePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});

ipcMain.handle('rename-folder', async (_event, { oldPath, newPath }) => {
    try {
        const parentDir = path.dirname(oldPath);
        const newFolderPath = path.join(parentDir, newPath);
        await fs.promises.rename(oldPath, newFolderPath);
        return { success: true, newPath: newFolderPath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});

ipcMain.handle('delete-files', async (_event, paths: string[]) => {
    try {
        for (const filePath of paths) {
            if (filePath && fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath)
                .catch(err => console.error(`Error deleting file ${filePath}:`, err));
            }
        }
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});

ipcMain.handle('open-review-window', (_event, { filePath, duration, sessionPath, webcamPath }) => {
    const reviewWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Recording Complete',
        webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        },
    });
    reviewWin.focus();
    reviewWin.loadFile(
        path.join(__dirname, '../../src/renderer/review.html'),
        { query: { path: filePath, duration, sessionPath, webcamPath } }
    ); 
});

ipcMain.on('close-review-window', (event, { screenPath, webcamPath }: { screenPath: string, webcamPath: string }) => {
    const sessionDir = screenPath && screenPath.length > 0 ? path.dirname(screenPath) : 
                    (webcamPath && webcamPath.length > 0 ? path.dirname(webcamPath) : null);
                    
    if (screenPath) {
        fs.promises.unlink(screenPath)
        .catch(err => console.error('Error deleting screen recording:', err));
    }
    if (webcamPath) {
        fs.promises.unlink(webcamPath)
        .catch(err => console.error('Error deleting webcam recording:', err));
    }
    if (sessionDir) {
        setTimeout(() => {
            fs.promises.rmdir(sessionDir)
            .catch(err => console.error('Error deleting session directory:', err));
        }, 500);
    }
    BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.on('open-folder', (_event, folderPath: string) => {
    shell.openPath(folderPath);
});

ipcMain.handle('choose-save-location', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        return null;
    }
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('merge-recordings', async (_event, { screenPath, webcamPath, sessionPath }) => {
    try {
        const screenDimensions = await getVideoDimensions(screenPath);
        const outputPath = path.join(sessionPath, `merged-${Date.now()}.mp4`);
        await mergeRecordings(screenPath, webcamPath, outputPath, screenDimensions);
        return { success: true, outputPath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
});