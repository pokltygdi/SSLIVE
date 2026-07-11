# SSLIVE (Small Storage LIVE)

A lightweight, ultra-optimized live streaming server engine built with Node.js. 

**SSLIVE** is designed with a strict resource-saving philosophy: **0 bytes written to the SSD/HDD**. The server processes live video frames entirely inside a small, dynamic RAM buffer using a rolling window architecture. Once a frame leaves the buffer window, it is instantly cleared from memory.

---

## Key Features

* **RAM-Only Processing:** It processes the stream on **ram** , it doesnt eat the hard drive
* **Dual Ingestion Mode:** Supports both modern **WebSockets** (for custom web/app captures) and industry-standard **RTMP** (for streaming via OBS Studio).
* **Ultra-Low Latency:** Dynamic rolling buffer (`BUFFER_SIZE = 10`) ensures new viewers catch up to the live feed instantly without lagging behind history. (buffer size in frames)
* **REST API Included:** Endpoints to monitor active streams, current viewer counts, and buffer statuses.

---

## Installation & Setup

### 1. Requirements
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Quick Run Script (`run.bat`)
For quick deployment on Windows, simply double-click the `run.bat` file. It will automatically install the required node modules (`cors`, `express`, `node-media-server`, `ws`) and start the engine.

---

## How to Stream (Broadcaster Tutorial)

You can send media to SSLIVE using two methods:

### Method A: Streaming via OBS Studio (RTMP)
1. Open **OBS Studio** -> Go to **Settings** -> **Stream**.
2. Select **Custom...** in the Service dropdown.
3. Enter the Server URL: `rtmp://localhost:1935/live/`
4. Enter your custom **Stream Key** (e.g., `my-awesome-stream`).
5. Click **Start Streaming**. SSLIVE will automatically register the stream event.

### Method B: Custom Web Broadcaster (WebSocket)
Establish a WebSocket connection as a broadcaster and push text/binary payloads:
```javascript
const ws = new WebSocket('ws://localhost:3000?stream=my-awesome-stream&role=broadcaster');

ws.onopen = () => {
    // Send standard frames packed into JSON or raw binary
    const framePayload = {
        type: 'frame',
        payload: 'YOUR_BASE64_OR_RAW_FRAME_DATA'
    };
    ws.send(JSON.stringify(framePayload));
};
```

---

## How to Consume (Website Integration Tutorial)

Integrating the live feed into your frontend application is straightforward via standard WebSockets.

### Integrating the Player on Your Site

When a viewer connects, the server instantly dumps the current active RAM buffer to sync the playback, then feeds live frames in real-time.

```javascript
// Connect to the stream as a viewer
const streamId = 'my-awesome-stream';
const socketUrl = `ws://localhost:3000?stream=${streamId}&role=viewer`;
const ws = new WebSocket(socketUrl);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'buffer') {
        console.log('Received initial rolling buffer:', data.payload);
        // Load the last 10 frames to instantly catch up with the stream
        data.payload.forEach(frame => renderFrameToCanvas(frame.data));
    } 
    
    if (data.type === 'frame') {
        // Render incoming real-time frame
        renderFrameToCanvas(data.payload.data);
    }
};

function renderFrameToCanvas(base64Data) {
    if (!base64Data) return;
    // Your rendering logic here (e.g., painting onto an HTML5 <canvas> or <img> src)
    // Example: document.getElementById('player').src = 'data:image/jpeg;base64,' + base64Data;
}

```

---

## API Monitoring Reference

* **GET** `/api/streams` - Fetch a live list of all active broadcast channels, current viewers count, and dynamic memory load metrics.
* **POST** `/api/stream/create` - Programmatically register a secure stream endpoint.
* **DELETE** `/api/stream/:id` - Explicitly kill and flush a stream environment.

---

```
// ========================================
// MADE BY POKLTY
// ========================================

```

```

```
