import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

// Singleton socket — one connection for the app lifetime
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL);
  }
  return socketInstance;
}

export function useSocket(
  event: string,
  handler: (...args: unknown[]) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = (...args: unknown[]) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => { socket.off(event, listener); };
  }, [event]);
}
