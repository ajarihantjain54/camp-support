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

    // Call secure RPC instead of querying the staff table directly
    const { data, error: dbError } = await supabase.rpc('verify_staff_pin', { 
      pin: pin.trim() 
    });

    if (dbError) {
      setLoading(false);
      setError('Connection error. Please try again.');
      return false;
    }

    if (!data) {
      setLoading(false);
      setError('Invalid PIN. Please try again.');
      return false;
    }

    // data contains { name, is_admin, contact_number }
    setLoading(false);
    setAuth({ 
      isAuthenticated: true, 
      staffName: data.name, 
      staffPin: pin, 
      isAdmin: data.is_admin 
    });
    return true;
  }

  function logout() {
    setAuth({ isAuthenticated: false, staffName: null, staffPin: null, isAdmin: false });
    setError(null);
  }

  return { ...auth, loading, error, login, logout };
}
