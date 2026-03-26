'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/services/api';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let socket: Socket;

    (async () => {
      let wsUrl = '';
      try {
        const res = await fetch('/runtime-config');
        const config = await res.json();
        if (config.wsUrl) {
          // Explicit API_PUBLIC_URL configured
          wsUrl = config.wsUrl;
        } else if (config.apiPort && typeof window !== 'undefined') {
          // Auto-derive: same hostname as browser, API port
          const { protocol, hostname } = window.location;
          wsUrl = `${protocol}//${hostname}:${config.apiPort}`;
        }
      } catch {
        // Fallback: connect to same origin
      }

      socket = io(wsUrl + '/ws', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socketRef.current = socket;
    })();

    return () => { socket?.disconnect(); };
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { socket: socketRef.current, connected, on };
}
