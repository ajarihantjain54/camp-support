import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SESSION_TOKEN_KEY } from './useAuth';

export interface PendingTicket {
  localId: string;
  issue_description: string;
  location: string;
  status: 'open';
  priority: 'low' | 'normal' | 'high' | 'critical';
  creator_name: string;
  queued_at: string;
}

const STORAGE_KEY = 'pending_tickets';

function loadFromStorage(): PendingTicket[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveToStorage(tickets: PendingTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function useSync() {
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pending, setPending]     = useState<PendingTicket[]>(loadFromStorage);

  // ── Track connectivity ──────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Queue a ticket locally ──────────────────────────────────────────────────
  const queueTicket = useCallback((ticket: Omit<PendingTicket, 'localId' | 'queued_at'>) => {
    const entry: PendingTicket = {
      ...ticket,
      localId: crypto.randomUUID(),
      queued_at: new Date().toISOString(),
    };
    setPending(prev => {
      const updated = [...prev, entry];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  // ── Background flush when connectivity is restored ──────────────────────────
  useEffect(() => {
    if (!isOnline || pending.length === 0) return;

    let cancelled = false;

    async function flush() {
      setIsSyncing(true);
      const queue = loadFromStorage(); // always read latest from storage
      const remaining: PendingTicket[] = [];

      for (const ticket of queue) {
        if (cancelled) break;
        const token = localStorage.getItem(SESSION_TOKEN_KEY) ?? '';
        const { data: ok, error } = await supabase.rpc('insert_ticket_secure', {
          p_token:        token,
          p_description:  ticket.issue_description,
          p_location:     ticket.location,
          p_priority:     ticket.priority,
          p_creator_name: ticket.creator_name,
          p_status:       ticket.status,
        });
        // Keep in queue if network error; discard if token expired (user must re-login)
        if (error) remaining.push(ticket);
        else if (ok === false) remaining.push(ticket); // token expired — retry after re-login
      }

      if (!cancelled) {
        saveToStorage(remaining);
        setPending(remaining);
        setIsSyncing(false);
      }
    }

    flush();
    return () => { cancelled = true; };
  }, [isOnline]); // re-run whenever we come back online

  return { isOnline, isSyncing, pendingCount: pending.length, pending, queueTicket };
}
