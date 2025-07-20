const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server is running.');
});

const wss = new WebSocket.Server({ server, path: '/socket' });

wss.on('connection', (ws) => {
  ws.send('Connected to Railway WebSocket server!');
  ws.on('message', (message) => {
    // Echo the message back
    ws.send(`Echo: ${message}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
}); 