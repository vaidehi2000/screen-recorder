import { contextBridge, ipcRenderer } from 'electron';
import type { SaveRecordingPayload } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
    getSources: () => ipcRenderer.invoke('get-sources'),
    saveRecording: (payload: SaveRecordingPayload) => 
      ipcRenderer.invoke('save-recording', payload),
    newSessionId: () => ipcRenderer.invoke('new-session-id'),
    openFolder: (folderPath: string) => ipcRenderer.send('open-folder', folderPath),
    closeReviewWindow: (paths: { screenPath: string; webcamPath: string }) => ipcRenderer.send('close-review-window', paths),
    openReviewWindow: (data: { filePath: string; duration: string; sessionPath: string }) => 
      ipcRenderer.invoke('open-review-window', data),
    renameFile: (params: { oldPath: string; newPath: string }) => 
      ipcRenderer.invoke('rename-file', params),
    renameFolder: (params: { oldPath: string; newPath: string }) => 
      ipcRenderer.invoke('rename-folder', params),
    chooseSaveLocation: () => ipcRenderer.invoke('choose-save-location'),
    mergeRecordings: (params: { screenPath: string; webcamPath: string; sessionPath: string }) => 
      ipcRenderer.invoke('merge-recordings', params),
    deleteFiles: (paths: string[]) => ipcRenderer.invoke('delete-files', paths)
}); 