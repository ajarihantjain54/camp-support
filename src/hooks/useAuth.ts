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

    // Step 1: verify PIN exists
    const { data, error: dbError } = await supabase
      .from('staff')
      .select('name, pin_access')
      .eq('pin_access', pin.trim())
      .maybeSingle();

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

    // Step 2: try to read is_admin (column may not exist on older installs)
    let isAdmin = false;
    const { data: adminData } = await supabase
      .from('staff')
      .select('is_admin')
      .eq('pin_access', pin.trim())
      .maybeSingle();
    if (adminData && typeof (adminData as any).is_admin === 'boolean') {
      isAdmin = (adminData as any).is_admin;
    }

    setLoading(false);
    setAuth({ isAuthenticated: true, staffName: data.name, staffPin: pin, isAdmin });
    return true;
  }

  function logout() {
    setAuth({ isAuthenticated: false, staffName: null, staffPin: null, isAdmin: false });
    setError(null);
  }

  return { ...auth, loading, error, login, logout };
}
