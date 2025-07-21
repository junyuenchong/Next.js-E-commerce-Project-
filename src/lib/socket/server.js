/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Custom HTTP handlers for real-time updates
    if (req.method === 'POST' && req.url === '/emit-products-update') {
      io.emit('products_updated');
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (req.method === 'POST' && req.url === '/emit-categories-update') {
      io.emit('categories_updated');
      res.writeHead(200);
      res.end('ok');
      return;
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
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

  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    console.log(`Next.js and Socket.IO server running on port ${port}`);
  });
}); 