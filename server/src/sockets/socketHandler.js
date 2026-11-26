const socketIO = require('socket.io');
const { setSocketIO: setConvSocketIO } = require('../services/aiConversationService');
const { setSocketIO: setNotifSocketIO } = require('../services/notificationService');

const initializeSockets = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  setConvSocketIO(io);
  setNotifSocketIO(io);

  io.on('connection', (socket) => {
    socket.on('join_workspace', (workspaceId) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

module.exports = { initializeSockets };
