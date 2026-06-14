import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  socketListCreated,
  socketListUpdated,
  socketListDeleted,
  socketListReordered,
  socketCardCreated,
  socketCardUpdated,
  socketCardMoved,
  socketCardDeleted,
  socketBoardUpdated,
  socketUserJoined,
  socketUserLeft,
} from '../store/slices/boardSlice';
import { addNotification } from '../store/slices/notificationSlice';
import {
  socketSprintCreated,
  socketSprintUpdated,
  socketSprintDeleted,
  socketSprintCompleted,
} from '../store/slices/sprintSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export const useSocket = (boardId) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (boardId) socket.emit('board:join', boardId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Board events
    socket.on('board:updated', (data) => dispatch(socketBoardUpdated(data)));

    // List events
    socket.on('list:created', (data) => dispatch(socketListCreated(data)));
    socket.on('list:updated', (data) => dispatch(socketListUpdated(data)));
    socket.on('list:deleted', (data) => dispatch(socketListDeleted(data)));
    socket.on('list:reordered', (data) => dispatch(socketListReordered(data)));

    // Card events
    socket.on('card:created', (data) => dispatch(socketCardCreated(data)));
    socket.on('card:updated', (data) => dispatch(socketCardUpdated(data)));
    socket.on('card:moved', (data) => dispatch(socketCardMoved(data)));
    socket.on('card:deleted', (data) => dispatch(socketCardDeleted(data)));

    // Sprint events
    socket.on('sprint:created', (data) => dispatch(socketSprintCreated(data)));
    socket.on('sprint:updated', (data) => dispatch(socketSprintUpdated(data)));
    socket.on('sprint:deleted', (data) => dispatch(socketSprintDeleted(data)));
    socket.on('sprint:completed', (data) => dispatch(socketSprintCompleted(data)));

    // User presence
    socket.on('user:joined', (data) => {
      dispatch(socketUserJoined(data));
      if (data.user._id !== user?._id) {
        toast(`${data.user.name} joined the board`, { icon: '👋', duration: 2000 });
      }
    });
    socket.on('user:left', (data) => dispatch(socketUserLeft(data)));

    // Notifications
    socket.on('notification:new', (notification) => {
      dispatch(addNotification(notification));
      toast(notification.message, { icon: '🔔', duration: 4000 });
    });

    return () => {
      if (boardId) socket.emit('board:leave', boardId);
      socket.disconnect();
    };
  }, [token, boardId]);

  return socketRef;
};
