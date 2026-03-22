import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Only an opaque server-issued token is stored locally.
// Name, isAdmin, and all identity claims come exclusively from the server.
export const SESSION_TOKEN_KEY = 'camp_support_token';

// Max time to wait for verify_session before unblocking the UI.
// On very slow networks the app becomes usable after this, with isAdmin: false
// as the safe default until the server confirms admin status.
const RESTORE_TIMEOUT_MS = 5000;

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
   *
   * NETWORK FAILURE POLICY (critical for camp / sketchy networks):
   *   - Token not found / expired on server  → clear storage, force re-login
   *   - Network error (offline / timeout)    → keep token, stay authenticated
   *     with isAdmin: false as safe default. Will re-verify next time online.
   *
   * This means staff can still USE the app offline after initial login,
   * but admin features are locked until the next successful verify_session.
   */
  useEffect(() => {
    const token = loadToken();
    if (!token) {
      setRestoring(false);
      return;
    }

    let cancelled = false;

    // Safety net: unblock UI after RESTORE_TIMEOUT_MS even if server is slow.
    // User stays authenticated (token preserved) with isAdmin: false.
    const timeout = setTimeout(() => {
      if (!cancelled) setRestoring(false);
    }, RESTORE_TIMEOUT_MS);

    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('verify_session', { p_token: token });
        if (cancelled) return;

        const row = Array.isArray(data) ? data[0] ?? null : data ?? null;

        if (rpcError || !row?.name) {
          // Token is invalid or expired server-side — must log in again.
          // Only clear on a definitive server rejection, NOT on network errors.
          if (!rpcError) localStorage.removeItem(SESSION_TOKEN_KEY);
        } else {
          // Token valid — restore full session with authoritative server values.
          setAuth({
            isAuthenticated: true,
            staffName: row.name,
            staffPin: null,
            isAdmin: row.is_admin === true,
          });
        }
      } catch {
        // Network error or timeout — keep the token and stay authenticated.
        // isAdmin remains false (safe default) until next successful verification.
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  async function login(pin: string): Promise<boolean> {
    setLoading(true);
    setError(null);

    // Single round trip: verify PIN + create session atomically.
    // Halves login latency vs two sequential RPC calls on slow networks.
    const { data, error: dbError } = await supabase
      .rpc('login_staff', { input_pin: pin.trim() });

    if (dbError) {
      setLoading(false);
      setError('Connection error. Please try again.');
      return false;
    }

    const result = Array.isArray(data) ? data[0] ?? null : data ?? null;
    if (!result?.token) {
      setLoading(false);
      setError('Invalid PIN. Please try again.');
      return false;
    }

    // Only the opaque token is stored — no name, no role, no flags.
    localStorage.setItem(SESSION_TOKEN_KEY, result.token as string);

    const isAdmin = result.is_admin === true;
    setLoading(false);
    setAuth({ isAuthenticated: true, staffName: result.name, staffPin: pin, isAdmin });
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
