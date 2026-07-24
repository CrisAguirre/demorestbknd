let io = null;

function init(server) {
  const { Server } = require('socket.io');
  const corsOptions = require('../config/cors');

  io = new Server(server, {
    cors: { origin: corsOptions.origin, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], credentials: true }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado: ' + socket.id);
    socket.on('join:kitchen', () => socket.join('kitchen'));
    socket.on('disconnect', () => console.log('Cliente desconectado: ' + socket.id));
  });

  console.log('Socket.io inicializado');
}

function getIO() {
  if (!io) throw new Error('Socket.io no ha sido inicializado');
  return io;
}

function emitKitchenEvent(event, data) {
  if (io) io.to('kitchen').emit(event, data);
}

module.exports = { init, getIO, emitKitchenEvent };