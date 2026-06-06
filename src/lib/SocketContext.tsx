import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = React.useState<Socket | null>(null);

  useEffect(() => {
    // Connect to the same host as the app
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      console.log('Socket connected');
      if (user) {
        s.emit('identify', user.uid);
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user && socket?.connected) {
      socket.emit('identify', user.uid);
    }
  }, [user, socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
