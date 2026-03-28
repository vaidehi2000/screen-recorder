import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getSources: () => ipcRenderer.invoke('get-sources'),
    saveRecording: (payload: any) => ipcRenderer.invoke('save-recording', payload),
    newSessionId: () => ipcRenderer.invoke('new-session-id'),
    openFolder: (folderPath: string) => ipcRenderer.send('open-folder', folderPath),
    closeReviewWindow: (paths: { screenPath: string; webcamPath: string }) => ipcRenderer.send('close-review-window', paths),
    minimize: () => ipcRenderer.invoke('minimize'),
    close: () => ipcRenderer.invoke('close'),
    openReviewWindow: (data: { filePath: string; duration: string; sessionPath: string }) => 
      ipcRenderer.invoke('open-review-window', data),
}); 