const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Socket.IO server is running.');
});

const io = new Server(server, {
  path: '/socket',
  cors: {
    origin: '*', // You can restrict this to your Vercel domain for security
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  // Allow clients to join the "categories" room
  socket.on('join', (room) => {
    if (room === 'categories') {
      socket.join('categories');
      console.log('Client joined categories room');
    }
  });

  socket.emit('message', 'Hello from Railway Socket.IO!');
  socket.on('message', (msg) => {
    socket.emit('message', `Echo: ${msg}`);
  });
});

// Function to emit category updates to all clients in the 'categories' room
function emitCategoriesUpdate() {
  io.to('categories').emit('categories_updated');
}

module.exports = { server, emitCategoriesUpdate };

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
}); 