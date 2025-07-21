/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Socket.IO server is running.\n');
});

const io = new Server(server, {
  path: '/socket', // Set path to match frontend
  cors: {
    origin: '*', // Adjust for production!
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('message', 'Hello from Socket.IO!');
  socket.on('message', (msg) => {
    socket.emit('message', `Echo: ${msg}`);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
}); 