/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

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
    if (room === 'products') {
      socket.join('products');
      console.log('Client joined products room');
    }
  });

  socket.emit('message', 'Hello from Railway Socket.IO!');
  socket.on('message', (msg) => {
    socket.emit('message', `Echo: ${msg}`);
  });
});

// HTTP endpoint to emit products_updated
app.post('/emit-products-update', (req, res) => {
  io.to('products').emit('products_updated');
  res.sendStatus(200);
});

// HTTP endpoint to emit categories_updated
app.post('/emit-categories-update', (req, res) => {
  io.to('categories').emit('categories_updated');
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
}); 