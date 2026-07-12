---

# SSLIVE (Small Storage LIVE) — v1.3

A lightweight, ultra-optimized live streaming server engine built with Node.js.

**SSLIVE** is designed with a strict resource-saving philosophy: **0 bytes written to the SSD/HDD**. The server processes live video frames entirely inside a small, dynamic RAM buffer using a rolling window architecture. Once a frame leaves the buffer window, it is instantly cleared from memory, preventing drive wear and saving disk space.

---

## Key Features

* **RAM-Only Processing:** Streams are handled purely inside temporary volatile memory (`Map`). Zero hard drive stress.
* **Dual Ingestion Mode:** Supports both modern **WebSockets** (for custom app captures/canvas streaming) and industry-standard **RTMP** (via Node-Media-Server for streaming from OBS Studio).
* **Live Chat Engine:** Built-in WebSocket message routing for real-time text chat alongside the video feed.
* **Ultra-Low Latency:** Dynamic rolling frame buffer (`BUFFER_SIZE = 10`) ensures new viewers catch up to the live feed instantly without lagging behind history.
* **REST API Included:** Out-of-the-box endpoints to monitor streams (with custom stream names), active viewer counts, and buffer health.

---

## Installation & Setup

### 1. Requirements

Make sure you have [Node.js](https://nodejs.org/) installed.

### 2. Quick Run Script (`run.bat`)

For deployment on Windows, create a `run.bat` file in the root directory:

```batch
@echo off
npm install express ws cors node-media-server
node server.js
pause

```

Simply double-click it to auto-install dependencies and spin up the engine.

---

## How to Stream (Broadcaster Tutorial)

### Method A: Streaming via OBS Studio (RTMP)

1. Open **OBS Studio** $\rightarrow$ **Settings** $\rightarrow$ **Stream**.
2. Select **Custom...** in the *Service* dropdown.
3. Enter the Server URL: `rtmp://localhost:1935/live/`
4. Enter your custom **Stream Key** (Make sure to register it first via the API or it will generate dynamically on connect).
5. Click **Start Streaming**.

### Method B: Web Broadcaster (WebSocket)

Establish a WebSocket connection as a broadcaster and push text/binary frame payloads:

```javascript
const ws = new WebSocket('ws://localhost:3000?stream=my-awesome-stream&role=broadcaster');

ws.onopen = () => {
    // Send standard video frames packed into JSON
    const framePayload = {
        type: 'frame',
        payload: 'YOUR_BASE64_IMAGE_OR_RAW_STRING'
    };
    ws.send(JSON.stringify(framePayload));
};

```

---

## How to Consume (Website Integration Tutorial)

Integrating the live feed and chat into your frontend application is straightforward via standard WebSockets.

### Integrating the Player & Chat on Your Site

When a viewer connects, the server instantly dumps the current active RAM buffer to sync the playback, then feeds live frames and chat messages in real-time.

```javascript
const streamId = 'my-awesome-stream';
const ws = new WebSocket(`ws://localhost:3000?stream=${streamId}&role=viewer`);

ws.onmessage = (event) => {
    const response = JSON.parse(event.data);

    // 1. Handle Initial Buffer Catch-up
    if (response.type === 'buffer') {
        console.log('Received initial rolling buffer:', response.payload);
        // Load the last 10 frames to instantly catch up with the stream
        response.payload.forEach(frame => renderFrameToCanvas(frame.data));
    } 
    
    // 2. Handle Real-time Incoming Video Frames
    if (response.type === 'frame') {
        renderFrameToCanvas(response.payload.data);
    }

    // 3. Handle Real-time Live Chat
    if (response.type === 'chat') {
        displayChatMessage(response.payload);
    }
};

function renderFrameToCanvas(base64Data) {
    if (!base64Data) return;
    // Example: Paint base64 frames onto an HTML <img> element
    document.getElementById('player').src = base64Data;
}

function displayChatMessage(chat) {
    console.log(`[${new Date(chat.timestamp).toLocaleTimeString()}] ${chat.userId}: ${chat.text}`);
}

// Function to send chat messages from client-side
function sendChatMessage(text, userId = 'User123') {
    ws.send(JSON.stringify({
        type: 'chat_message',
        userId: userId,
        text: text
    }));
}

```

---

## API & Ports Reference

### Network Ports Layout

* `1935` — **RTMP Ingestion** (OBS Studio input)
* `3000` — **Express REST API & WebSocket Server** (Web Broadcasters & Viewers)
* `8080` — **NMS HTTP Panel** (Internal Node-Media-Server engine origin)

### Endpoints

* **GET** `/api/streams` — Fetch a live list of all active broadcast channels, custom names, current viewer counts, dynamic memory load metrics, and creation timestamps.
* **POST** `/api/stream/create` — Programmatically register a secure stream endpoint.
* *Payload Options:* `{ "streamId": "custom_id", "name": "My Stream Title" }`


* **DELETE** `/api/stream/:id` — Explicitly kill and flush a stream environment.

---

```
// ========================================
// SSLIVE SERVER 
// MADE BY POKLTY
// 7/11/2026 14:08, do not impersonate
// 1.3 version 7/11/26 19:42
// ========================================

```
