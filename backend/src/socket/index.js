const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getPublisher, getSubscriber } = require('../config/redis');

const REDIS_CHANNEL = 'trello:board-events';

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select('-password');
      if (!socket.user) return next(new Error('User not found'));
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  // Set up Redis pub/sub with graceful fallback for when Redis isn't running
  let redisReady = false;
  let publisher, subscriber;

  const tryRedis = async () => {
    try {
      publisher = getPublisher();
      subscriber = getSubscriber();

      await publisher.connect();
      await subscriber.connect();

      await subscriber.subscribe(REDIS_CHANNEL);
      subscriber.on('message', (channel, message) => {
        if (channel !== REDIS_CHANNEL) return;
        try {
          const { room, event, data, sourceId } = JSON.parse(message);
          // Only re-emit if this message didn't originate from this process
          if (sourceId !== process.pid.toString()) {
            io.to(room).emit(event, data);
          }
        } catch {}
      });

      redisReady = true;
      console.log('Socket Redis pub/sub ready');
    } catch (err) {
      console.warn('Socket Redis not available, running single-instance mode:', err.message);
    }
  };

  tryRedis();

  const broadcast = (room, event, data) => {
    // Always emit locally
    io.to(room).emit(event, data);
    // Also publish to Redis for other instances
    if (redisReady) {
      publisher
        .publish(REDIS_CHANNEL, JSON.stringify({ room, event, data, sourceId: process.pid.toString() }))
        .catch(() => {});
    }
  };

  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`[socket] ${user.name} connected`);

    // Join a personal room for targeted notifications
    socket.join(`user:${user._id}`);

    socket.on('board:join', (boardId) => {
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:joined', {
        user: { _id: user._id, name: user.name, avatar: user.avatar },
        boardId,
      });
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: user._id,
        boardId,
      });
    });

    // Typing indicator for comments
    socket.on('card:typing', ({ cardId, boardId }) => {
      socket.to(`board:${boardId}`).emit('card:typing', {
        user: { _id: user._id, name: user.name },
        cardId,
      });
    });

    socket.on('card:stop-typing', ({ cardId, boardId }) => {
      socket.to(`board:${boardId}`).emit('card:stop-typing', {
        userId: user._id,
        cardId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${user.name} disconnected`);
    });
  });
};

module.exports = initSocket;
