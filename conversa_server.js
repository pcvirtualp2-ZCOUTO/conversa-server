// Backend mínimo de WebSocket para o app Conversa (Node.js).
// Para produção, use HTTPS/WSS, autenticação, rate limiting e banco de dados.
const http = require('http');
const WebSocket = require('ws');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Conversa WebSocket server online');
});
const wss = new WebSocket.Server({ server, path: '/ws' });
const MAX_TEXT = 2000;
const MAX_ROOM = 180;
const roomBySocket = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'join') {
      const room = String(data.room || 'general').slice(0, MAX_ROOM);
      roomBySocket.set(ws, room);
      ws.send(JSON.stringify({ type: 'joined', room }));
      return;
    }
    if (data.type !== 'message') return;
    const room = String(data.room || '').slice(0, MAX_ROOM);
    const text = String(data.text || '').trim().slice(0, MAX_TEXT);
    const author = String(data.author || 'Usuário').slice(0, 48);
    if (!room || !text) return;
    // Broadcast somente para conexões que entraram na mesma sala.
    const payload = JSON.stringify({
      type: 'message', room, author, text,
      time: String(data.time || new Date().toISOString()).slice(0, 40)
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && roomBySocket.get(client) === room) {
        client.send(payload);
      }
    }
  });
  ws.on('close', () => roomBySocket.delete(ws));
  ws.on('error', () => roomBySocket.delete(ws));
});
const port = Number(process.env.PORT || 8080);
server.listen(port, '0.0.0.0', () => console.log(`Conversa server listening on ${port}`));
