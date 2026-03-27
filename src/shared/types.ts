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
    closeReviewWindow: () => void;
    minimize: () => void;
    close: () => void;
    openReviewWindow: (params: { 
        filePath: string; 
        duration: string; 
        sessionPath: string, 
        webcamPath: string 
    }) => Promise<void>;
}

export interface SaveRecordingPayload {
    buffer: ArrayBuffer;
    type: 'screen' | 'webcam';
    sessionId: string;
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