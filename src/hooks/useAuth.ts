import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  staffName: string | null;
  staffPin: string | null;
  isAdmin: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    staffName: null,
    staffPin: null,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(pin: string): Promise<boolean> {
    setLoading(true);
    setError(null);

    // verify_staff_pin() uses pgcrypto crypt() server-side — PIN never sent as plain-text
    const { data, error: dbError } = await supabase
      .rpc('verify_staff_pin', { input_pin: pin.trim() });

    if (dbError) {
      setLoading(false);
      setError('Connection error. Please try again.');
      return false;
    }

    // RPC returns a table (array); empty = no match
    const staff = Array.isArray(data) ? data[0] ?? null : data ?? null;
    if (!staff) {
      setLoading(false);
      setError('Invalid PIN. Please try again.');
      return false;
    }

    const isAdmin = typeof staff.is_admin === 'boolean' ? staff.is_admin : false;
    setLoading(false);
    setAuth({ isAuthenticated: true, staffName: staff.name, staffPin: pin, isAdmin });
    return true;
  }

  function logout() {
    setAuth({ isAuthenticated: false, staffName: null, staffPin: null, isAdmin: false });
    setError(null);
  }

  return { ...auth, loading, error, login, logout };
}
