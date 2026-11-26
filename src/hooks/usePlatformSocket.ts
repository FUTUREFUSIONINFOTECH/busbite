
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlatformState } from '../types/platform';

// Production backend configuration
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/+$/, '');

const WS_URL = import.meta.env.VITE_WS_URL || '';

function getApiUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!API_BASE_URL && !import.meta.env.DEV) {
    throw new Error(
      'Backend URL is missing. Configure VITE_API_URL in production.'
    );
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function getWsUrl() {
  if (WS_URL) return WS_URL;

  // Derive WebSocket address from production backend URL
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/^http/i, 'ws')}/ws`;
  }

  if (import.meta.env.DEV) {
    const protocol =
      window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    return `${protocol}//${window.location.host}/ws`;
  }

  throw new Error('WebSocket URL is missing. Configure VITE_WS_URL.');
}

// Safely parse JSON responses
async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (text.trim().startsWith('<')) {
      throw new Error(
        `Backend returned HTML instead of JSON (HTTP ${res.status}). Check your API URL and backend route.`
      );
    }

    throw new Error(
      `Invalid JSON response from backend (HTTP ${res.status}).`
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed (HTTP ${res.status})`
    );
  }

  return data as T;
}

export function usePlatformSocket() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/state'));

      const data = await parseResponse<PlatformState>(res);

      setState(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach backend server'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unmounted = false;

    fetchSnapshot();

    const connect = () => {
      if (unmounted) return;

      let ws: WebSocket;

      try {
        ws = new WebSocket(getWsUrl());
        wsRef.current = ws;
      } catch (err) {
        setConnected(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to connect WebSocket'
        );
        return;
      }

      ws.onopen = () => {
        if (!unmounted) {
          setConnected(true);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            data?: PlatformState;
          };

          if (msg.data) {
            setState(msg.data);
            setLoading(false);
            setError(null);
          }
        } catch {
          console.warn('Invalid WebSocket message');
        }
      };

      ws.onclose = () => {
        if (unmounted) return;

        setConnected(false);

        reconnectTimerRef.current = window.setTimeout(
          connect,
          2500
        );
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [fetchSnapshot]);

  const apiRequest = useCallback(
    async <T = unknown>(
      url: string,
      method: 'POST' | 'PATCH',
      body?: unknown
    ): Promise<T> => {
      const requestUrl = getApiUrl(url);

      const res = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      });

      return parseResponse<T>(res);
    },
    []
  );

  return {
    state,
    loading,
    connected,
    error,
    refresh: fetchSnapshot,

    post: <T = unknown>(url: string, body?: unknown) =>
      apiRequest<T>(url, 'POST', body),

    patch: <T = unknown>(url: string, body?: unknown) =>
      apiRequest<T>(url, 'PATCH', body),
  };
}
