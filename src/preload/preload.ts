import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getSources: () => ipcRenderer.invoke('get-sources'),
    saveRecording: (payload: any) => ipcRenderer.invoke('save-recording', payload),
    newSessionId: () => ipcRenderer.invoke('new-session-id'),
}); 