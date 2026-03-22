import { useState, useEffect, useCallback } from 'react';
import { supabase, type TicketRow } from '../lib/supabase';
import { SESSION_TOKEN_KEY } from './useAuth';

const CACHE_KEY = 'cached_tickets';

function loadCachedTickets(): TicketRow[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function saveCachedTickets(tickets: TicketRow[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(tickets));
}

export function useTickets() {
  const [tickets, setTickets] = useState<TicketRow[]>(loadCachedTickets);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, issue_description, location, status, priority, creator_name, assigned_to, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const freshTickets = data as TicketRow[];
      setTickets(freshTickets);
      saveCachedTickets(freshTickets);
    }
    setLoading(false);
  }, []);

  // ── Optimistic Update Function ──────────────────────────────────────────
  const updateTicketOptimistic = useCallback(async (
    id: number,
    updates: Partial<TicketRow>
  ) => {
    let previousTickets: TicketRow[] = [];
    
    // 1. Apply optimistic update to UI
    setTickets(prev => {
      previousTickets = prev;
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      saveCachedTickets(updated);
      return updated;
    });

    // 2. Perform actual server update via RPC (token + admin verified server-side)
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const { data: ok, error } = await supabase.rpc('update_ticket_secure', {
      p_token:       token ?? '',
      p_ticket_id:   id,
      p_status:      updates.status      ?? null,
      p_priority:    updates.priority    ?? null,
      p_assigned_to: updates.assigned_to ?? null,
    });

    // 3. Rollback if server update fails or token/admin check rejected
    if (error || ok === false) {
      console.error('Failed to update ticket:', error ?? 'Permission denied');
      setTickets(previousTickets);
      saveCachedTickets(previousTickets);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    fetchAll();

    // ── Supabase Realtime subscription ──────────────────────────────────────
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets(prev => {
            let next: TicketRow[];
            if (payload.eventType === 'INSERT') {
              next = [payload.new as TicketRow, ...prev];
            } else if (payload.eventType === 'UPDATE') {
              next = prev.map(t => t.id === (payload.new as TicketRow).id ? (payload.new as TicketRow) : t);
            } else if (payload.eventType === 'DELETE') {
              next = prev.filter(t => t.id !== (payload.old as TicketRow).id);
            } else {
              return prev;
            }
            saveCachedTickets(next);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchAll]);

  return { tickets, loading, refetch: fetchAll, updateTicketOptimistic };
}
