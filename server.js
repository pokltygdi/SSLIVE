// ========================================
// SSLIVE SERVER 
// MADE BY POKLTY
// 7/11/2026 14:08, do not impersonate
// ========================================


const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const NodeMediaServer = require('node-media-server');

const streams = {};
const BUFFER_SIZE = 10;

// RTMP
const nms = new NodeMediaServer({
    rtmp: { port: 1935, chunk_size: 60000 },
    http: { port: 8080, allow_origin: '*' }
});

nms.on('prePublish', (id, StreamPath) => {
    const streamId = StreamPath.replace('/live/', '');
    streams[streamId] = { active: true, buffer: [], viewers: 0, createdAt: Date.now() };
});

nms.on('rtmp', (id, StreamPath, args, packet) => {
    const streamId = StreamPath.replace('/live/', '');
    if (!streams[streamId]) return;
    const frame = { timestamp: Date.now(), data: packet.data ? packet.data.toString('base64') : null };
    streams[streamId].buffer.push(frame);
    if (streams[streamId].buffer.length > BUFFER_SIZE) streams[streamId].buffer.shift();
});

// API + WebSocket 
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.get('/api/streams', (req, res) => {
    res.json(Object.keys(streams).map(id => ({
        id,
        active: streams[id].active !== false,
        viewers: streams[id].viewers || 0,
        bufferSize: streams[id].buffer?.length || 0,
        createdAt: streams[id].createdAt
    })));
});

app.post('/api/stream/create', (req, res) => {
    const streamId = req.body.streamId || 'stream_' + Date.now();
    if (!streams[streamId]) {
        streams[streamId] = { active: true, buffer: [], viewers: 0, createdAt: Date.now() };
        res.json({ success: true, streamId });
    } else {
        res.status(400).json({ error: 'Stream already exists' });
    }
});

app.delete('/api/stream/:id', (req, res) => {
    const streamId = req.params.id;
    if (streams[streamId]) {
        delete streams[streamId];
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Stream not found' });
    }
});

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const streamId = url.searchParams.get('stream');
    const role = url.searchParams.get('role');

    if (!streamId) { ws.close(); return; }
    ws.streamId = streamId;

    if (role === 'viewer') {
        if (!streams[streamId]) { ws.close(); return; }
        streams[streamId].viewers = (streams[streamId].viewers || 0) + 1;
        ws.send(JSON.stringify({ type: 'buffer', payload: streams[streamId].buffer }));
        ws.on('close', () => {
            if (streams[streamId]) streams[streamId].viewers = Math.max(0, (streams[streamId].viewers || 1) - 1);
        });
    } else if (role === 'broadcaster') {
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'frame') {
                    if (!streams[streamId]) {
                        streams[streamId] = { active: true, buffer: [], viewers: 0, createdAt: Date.now() };
                    }
                    const frame = { timestamp: Date.now(), data: data.payload };
                    streams[streamId].buffer.push(frame);
                    if (streams[streamId].buffer.length > BUFFER_SIZE) streams[streamId].buffer.shift();
                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN && client.streamId === streamId) {
                            client.send(JSON.stringify({ type: 'frame', payload: frame }));
                        }
                    });
                }
            } catch (e) {}
        });
        ws.on('close', () => { if (streams[streamId]) streams[streamId].active = false; });
    }
});

server.listen(3000, '0.0.0.0', () => console.log('API+WS on port 3000'));
nms.run();
console.log('RTMP on port 1935');