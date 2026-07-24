let io = null;

function init(server) {
  const { Server } = require('socket.io');
  const corsOptions = require('../config/cors');

  io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(` Cliente conectado: ${socket.id}`);

    socket.on('join:kitchen', () => {
      socket.join('kitchen');
    });

    socket.on('disconnect', ()
