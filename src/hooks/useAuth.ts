import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Only an opaque server-issued token is stored locally.
// Name, isAdmin, and all identity claims come exclusively from the server.
export const SESSION_TOKEN_KEY = 'camp_support_token';

interface AuthState {
  isAuthenticated: boolean;
  staffName: string | null;
  staffPin: string | null;
  isAdmin: boolean;
}

function loadToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function useAuth() {
  // Start unauthenticated; useEffect below will verify the stored token.
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    staffName: null,
    staffPin: null,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True while the initial token verification is in flight.
  const [restoring, setRestoring] = useState(true);

  /**
   * On every app open, verify the stored token against the server.
   * The server returns name + is_admin — no client-supplied claims are trusted.
   * If the token is missing, expired, or invalid, the user must log in again.
   */
  useEffect(() => {
    const token = loadToken();
    if (!token) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('verify_session', { p_token: token });
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] ?? null : data ?? null;
        if (row?.name) {
          setAuth({
            isAuthenticated: true,
            staffName: row.name,
            staffPin: null,
            isAdmin: row.is_admin === true,
          });
        } else {
          // Token expired or revoked server-side
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      } catch {
        // Network error — clear local state; user must log in when online
        localStorage.removeItem(SESSION_TOKEN_KEY);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function login(pin: string): Promise<boolean> {
    setLoading(true);
    setError(null);

    // Step 1: verify PIN server-side (pgcrypto crypt — PIN never plain-text)
    const { data, error: dbError } = await supabase
      .rpc('verify_staff_pin', { input_pin: pin.trim() });

    if (dbError) {
      setLoading(false);
      setError('Connection error. Please try again.');
      return false;
    }

    const staff = Array.isArray(data) ? data[0] ?? null : data ?? null;
    if (!staff) {
      setLoading(false);
      setError('Invalid PIN. Please try again.');
      return false;
    }

    // Step 2: create a server-side session; receive an opaque token.
    const { data: token, error: sessionError } = await supabase
      .rpc('create_session', { p_staff_id: staff.id });

    if (sessionError || !token) {
      setLoading(false);
      setError('Session error. Please try again.');
      return false;
    }

    // Only the opaque token is stored — no name, no role, no flags.
    localStorage.setItem(SESSION_TOKEN_KEY, token as string);

    const isAdmin = typeof staff.is_admin === 'boolean' ? staff.is_admin : false;
    setLoading(false);
    setAuth({ isAuthenticated: true, staffName: staff.name, staffPin: pin, isAdmin });
    return true;
  }

  async function logout() {
    const token = loadToken();
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setAuth({ isAuthenticated: false, staffName: null, staffPin: null, isAdmin: false });
    setError(null);
    // Invalidate the token server-side so it cannot be reused even if captured.
    if (token) {
      try { await supabase.rpc('delete_session', { p_token: token }); } catch { /* best-effort */ }
    }
  }

  return { ...auth, loading, restoring, error, login, logout };
}
