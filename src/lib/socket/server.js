/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// Setup Next.js app
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer();
  
  // Setup Socket.IO with WebSocket support
  const io = new Server(server, {
    path: '/socket', // WebSocket endpoint path
    cors: {
      origin: ['https://next-js-e-commerce-project.onrender.com', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'], // Support both WebSocket and HTTP polling
    allowEIO3: true // Compatibility with older clients
  });

  // Handle HTTP requests
  server.on('request', (req, res) => {
    // Health check endpoint for Render
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    
    // Emit real-time product updates
    if (req.method === 'POST' && req.url === '/api/emit-products-update') {
      io.emit('products_updated');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // Emit real-time category updates
    if (req.method === 'POST' && req.url === '/api/emit-categories-update') {
      io.emit('categories_updated');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // Handle all other requests with Next.js
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Handle WebSocket connections
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    socket.emit('message', 'Hello from Socket.IO!');
    
    // Echo messages back to client
    socket.on('message', (msg) => {
      socket.emit('message', `Echo: ${msg}`);
    });
    
    // Log disconnections
    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });
    
    // Log socket errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
  
  // Log connection errors
  io.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  // Start server
  const port = process.env.PORT || 3002; // Can be changed to any available port
  server.listen(port, () => {
    console.log(`🚀 Next.js and Socket.IO server running on port ${port}`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${port}/socket`);
    console.log(`🌐 Production WebSocket: wss://next-js-e-commerce-project.onrender.com/socket`);
  });
});