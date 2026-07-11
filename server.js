// ========================================
// SSLIVE SERVER 
// MADE BY POKLTY
// 7/11/2026 14:08, do not impersonate
// 1.3 version 7/11/26 19:42
// ========================================


const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const NodeMediaServer = require('node-media-server');

const streams = new Map();
const BUFFER_SIZE = 50;

// RTMP
const nms = new NodeMediaServer({
    rtmp: { 
        port: 1935, 
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: { port: 8080, allow_origin: '*' }
});

nms.on('prePublish', (id, StreamPath) => {
    const streamId = StreamPath.replace('/live/', '');
    console.log(`> Streamer connected: ${streamId}`);
    
    if (!streams.has(streamId)) {
        streams.set(streamId, { active: true, buffer: [], viewers: 0, createdAt: Date.now() });
    } else {
        streams.get(streamId).active = true;
    }
});

nms.on('donePublish', (id, StreamPath) => {
    const streamId = StreamPath.replace('/live/', '');
    console.log(`> Streamer disconnected: ${streamId}`);
    if (streams.has(streamId)) streams.get(streamId).active = false;
});

// API + WebSocket 
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.get('/api/streams', (req, res) => {
    res.json(Array.from(streams.entries()).map(([id, data]) => ({
        id,
        name: data.name || 'No name',
        active: data.active,
        viewers: data.viewers,
        bufferSize: data.buffer.length,
        createdAt: data.createdAt
    })));
});

app.post('/api/stream/create', (req, res) => {
    const streamId = req.body.streamId || 'stream_' + Math.random().toString(36).slice(2, 9);
    if (streams.has(streamId)) return res.status(400).json({ error: 'Stream already exists' });

    streams.set(streamId, { active: false, buffer: [], viewers: 0, createdAt: Date.now() });
    res.json({ success: true, streamId });
});

app.delete('/api/stream/:id', (req, res) => {
    const streamId = req.params.id;
    if (!streams.has(streamId)) return res.status(404).json({ error: 'Stream not found' });
    
    streams.delete(streamId);
    res.json({ success: true });
});

app.post('/api/stream/create', (req, res) => {
    const streamId = req.body.streamId || 'stream_' + Math.random().toString(36).slice(2, 9);
    const streamName = req.body.name || 'No name';
    
    if (streams.has(streamId)) {
        return res.status(400).json({ error: 'Stream already exists' });
    }

    streams.set(streamId, {
        active: false,
        name: streamName,
        buffer: [],
        viewers: 0,
        createdAt: Date.now()
    });
    
    res.json({ success: true, streamId });
});

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const streamId = url.searchParams.get('stream');
    const role = url.searchParams.get('role');

    if (!streamId || !streams.has(streamId)) return ws.close(4001, 'Stream not found'); 
    
    ws.streamId = streamId;
    const currentStream = streams.get(streamId);

    if (role === 'viewer') {
        currentStream.viewers++;
        ws.send(JSON.stringify({ type: 'buffer', payload: currentStream.buffer }));
        
        ws.on('close', () => {
            if (streams.has(streamId)) {
                const s = streams.get(streamId);
                s.viewers = Math.max(0, s.viewers - 1);
            }
        });
    } else if (role === 'broadcaster') {
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'frame') {
                    const frame = { timestamp: Date.now(), data: data.payload };
                    currentStream.buffer.push(frame);
                    if (currentStream.buffer.length > BUFFER_SIZE) currentStream.buffer.shift();

                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN && client.streamId === streamId) {
                            client.send(JSON.stringify({ type: 'frame', payload: frame }));
                        }
                    });
                }

                if (data.type === 'chat_message') {
                    const chatEntry = { 
                        timestamp: Date.now(), 
                        userId: data.userId || 'Anonymous', 
                        text: data.text 
                    };
                    
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client.streamId === streamId) {
                            client.send(JSON.stringify({ type: 'chat', payload: chatEntry }));
                        }
                    });
                }
            } catch (e) {
                console.error('Bad JSON on WS message');
            }
        });
        ws.on('close', () => { 
            if (streams.has(streamId)) streams.get(streamId).active = false; 
        });
    }
});

server.listen(3000, '0.0.0.0', () => console.log('API+WS on port 3000'));
nms.run();
console.log('RTMP on port 1935');
