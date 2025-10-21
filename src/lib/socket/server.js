/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Initialize Socket.IO first
  const server = createServer();
  
  const io = new Server(server, {
    path: '/socket', // Set path to match frontend
    cors: {
      origin: ['https://next-js-e-commerce-project.onrender.com', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Now set up HTTP handlers with access to io
  server.on('request', (req, res) => {
    // Custom HTTP handlers for real-time updates
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    if (req.method === 'POST' && req.url === '/api/emit-products-update') {
      io.emit('products_updated');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/emit-categories-update') {
      io.emit('categories_updated');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    socket.emit('message', 'Hello from Socket.IO!');
    
    socket.on('message', (msg) => {
      socket.emit('message', `Echo: ${msg}`);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
  
  io.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    console.log(`🚀 Next.js and Socket.IO server running on port ${port}`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${port}/socket`);
    console.log(`🌐 Production WebSocket: wss://next-js-e-commerce-project.onrender.com/socket`);
  });
});