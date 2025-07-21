/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('WebSocket server is running.\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send('WebSocket connected!');
  // Place your custom WebSocket logic here
  ws.on('message', (message) => {
    // handle messages
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
}); 