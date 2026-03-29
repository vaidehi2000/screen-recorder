export interface CaptureSource {
    id: string;
    name: string;
    thumbnail: string; // Base64-encoded image
    appIcon: string | null; // Base64-encoded image or null
    isScreen: boolean;  
}

export interface ElectronAPI {
    getSources: () => Promise<CaptureSource[]>;
    saveRecording: (payload: SaveRecordingPayload) => Promise<SaveRecordingResponse>;
    newSessionId: () => Promise<string>;
    openFolder: (folderPath: string) => void;
    closeReviewWindow: (paths: { 
        screenPath: string; 
        webcamPath: string 
    }) => void;
    minimize: () => void;
    close: () => void;
    openReviewWindow: (params: { 
        filePath: string; 
        duration: string; 
        sessionPath: string, 
        webcamPath: string 
    }) => Promise<void>;
    renameFile: (params: {
        oldPath: string;
        newPath: string;
    }) => Promise<{ 
        success: boolean, 
        newPath?: string, 
        error?: string 
    }>;
    renameFolder: (params: {
        oldPath: string;
        newPath: string;
    }) => Promise<{ 
        success: boolean, 
        newPath?: string, 
        error?: string
    }>;
    chooseSaveLocation: () => Promise<string | null>;
    mergeRecordings: (params: {
        screenPath: string;
        webcamPath: string;
        sessionPath: string;
    }) => Promise<{ 
        success: boolean; 
        outputPath?: string; 
        error?: string 
    }>;
    deleteFiles: (paths: string[]) => Promise<{
        success: boolean;
        error?: string;
    }>;
}

export interface SaveRecordingResponse {
    success: boolean;
    filePath?: string;
    error?: string;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export interface SaveRecordingPayload {
    buffer: ArrayBuffer;
    type: 'screen' | 'webcam';
    sessionId: string;
    saveLocation?: string;
}