# Screen Recorder

A desktop screen and webcam recorder built with Electron and TypeScript.

## Features

- **Screen/Window Capture** — record any screen or application window
- **Webcam Recording** — optional webcam overlay, recorded as a separate file
- **Audio Recording** — microphone and system audio support, mixed together
- **Quality Control** — choose recording bitrate (Low / Medium / High / Ultra)
- **Custom Save Location** — choose where recordings are saved
- **Recording Review** — review recordings immediately after stopping
- **Rename Files** — rename screen, webcam, and folder directly in the review window
- **Merge to MP4** — combine screen and webcam into a single MP4 with picture-in-picture
- **Keep/Discard Options** — keep merged only, keep all files, or discard everything

## Tech Stack

| Technology | Role |
|---|---|
| **Electron** | Desktop app framework — bridges web tech with OS APIs |
| **TypeScript** | Type-safe JavaScript — catches bugs at compile time |
| **HTML/CSS** | UI structure and styling |
| **ffmpeg** | Video processing and merging via `fluent-ffmpeg` |
| **Web Audio API** | Mixing microphone and system audio into one stream |

## Architecture
```
src/
├── main/
│   └── main.ts          # Electron main process — OS APIs, file system, ffmpeg
├── preload/
│   └── preload.ts       # Secure IPC bridge between main and renderer
├── renderer/
│   ├── index.html       # Main app window
│   ├── index.css        # Main app styles
│   ├── renderer.ts      # Recording logic, MediaRecorder, Web Audio API
│   ├── review.html      # Recording review window
│   ├── review.css       # Review window styles
│   └── review.ts        # Review window logic
└── shared/
    └── types.ts         # Shared TypeScript interfaces used by all processes
```

## How It Works

1. **Source Picker** — uses Electron's `desktopCapturer` to list all screens and windows with live thumbnails, refreshing every 3 seconds
2. **Recording** — uses the browser's `MediaRecorder` API to capture screen video and webcam video as separate `.webm` files
3. **Audio Mixing** — system audio and microphone are captured as separate tracks, then mixed using the Web Audio API's `AudioContext` before being passed to `MediaRecorder`
4. **Saving** — completed recordings are sent via IPC to the main process, which writes them to disk using Node's `fs` module
5. **Merging** — ffmpeg combines screen and webcam recordings into a single `.mp4` with the webcam as a picture-in-picture overlay in the bottom right corner

## Security

- `contextIsolation: true` — renderer cannot access Node.js directly
- `nodeIntegration: false` — no raw Node in the browser context
- All OS operations go through the preload bridge via IPC

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
git clone https://github.com/vaidehi2000/screen-recorder.git
cd screen-recorder
npm install
```

`npm install` will automatically install all dependencies including:
- `electron` — desktop app framework
- `typescript` — TypeScript compiler
- `fluent-ffmpeg` — ffmpeg wrapper for video processing
- `@ffmpeg-installer/ffmpeg` — bundled ffmpeg binary (no separate install needed)
- `@ffprobe-installer/ffprobe` — bundled ffprobe binary (no separate install needed)
- `@types/node` — TypeScript types for Node.js

No separate installation of ffmpeg or ffprobe is required — they are bundled with the app via npm packages.


### Run
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Known Limitations

- System audio capture requires Windows — macOS may need additional configuration
- Output format is `.webm` for individual recordings, `.mp4` for merged output
- Merged video uses picture-in-picture layout with webcam in the bottom right corner

## Future Improvements

- Pause and resume recording
- Individual start/stop controls for screen and webcam
- Custom webcam overlay position and size
- Export to additional formats
- Recording history and management
- Tests
