import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PendingTicket {
  localId: string;
  issue_description: string;
  location: string;
  status: 'open';
  priority: 'low' | 'normal' | 'high' | 'critical';
  creator_pin: string;
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
        const { error } = await supabase.from('tickets').insert({
          issue_description: ticket.issue_description,
          location:          ticket.location,
          status:            ticket.status,
          creator_pin:       ticket.creator_pin,
        });
        if (error) remaining.push(ticket); // keep for retry on next attempt
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
