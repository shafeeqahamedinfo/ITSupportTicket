/**
 * SocketContext.jsx
 * Manages the Socket.IO connection for the entire app.
 * Connects when user is authenticated, disconnects on logout.
 *
 * Usage:
 *   const { socket, connected } = useSocket();
 */
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// In production (Render), frontend and backend share the same origin.
// In dev, fall back to the Vite proxy host or explicit VITE_API_URL.
const SOCKET_URL = (() => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace('/api', '');
  if (import.meta.env.PROD) return window.location.origin; // production: same host
  return 'http://localhost:5000'; // local dev
})();

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      // Disconnect when user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Create socket connection with auth token
    const token = localStorage.getItem('itcare_token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join user's personal room for targeted notifications
      socket.emit('join:user', user._id);
      // Join role room
      socket.emit('join:role', user.role);
      console.log(`🔌 Socket connected: ${socket.id} | User: ${user.fullName}`);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const value = {
    socket: socketRef.current,
    connected,
    /** Emit an event */
    emit: (event, data) => socketRef.current?.emit(event, data),
    /** Join a room (e.g. ticket room for live updates) */
    joinRoom: (room) => socketRef.current?.emit('join:room', room),
    /** Leave a room */
    leaveRoom: (room) => socketRef.current?.emit('leave:room', room),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}

export default SocketContext;
