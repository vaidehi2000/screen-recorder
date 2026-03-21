export interface CaptureSource {
    id: string;
    name: string;
    thumbnail: string; // Base64-encoded image
    appIcon: string | null; // Base64-encoded image or null
    isScreen: boolean;  
}

export interface ElectronAPI {
    getSources: () => Promise<CaptureSource[]>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}