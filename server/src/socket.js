import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');
      socket.user = decoded; // Contains id, role, etc.
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.user.id}`);

    // Join a room specifically for this user to receive direct messages
    socket.join(socket.user.id);

    // Update online status (optional, can be broadcasted or stored in Redis/DB)
    io.emit('vendor_online', { vendorId: socket.user.id });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.user.id}`);
      io.emit('vendor_offline', { vendorId: socket.user.id, lastSeen: new Date() });
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
