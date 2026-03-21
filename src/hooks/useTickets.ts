import { useState, useEffect } from 'react';
import { supabase, type TicketRow } from '../lib/supabase';

export function useTickets() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets((data as TicketRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();

    // ── Supabase Realtime subscription ──────────────────────────────────────
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new as TicketRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev =>
              prev.map(t => t.id === (payload.new as TicketRow).id ? (payload.new as TicketRow) : t)
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.id !== (payload.old as TicketRow).id));
          }
        }
      )
      .subscribe();

    // ── Memory leak prevention (React 18 Strict Mode safe) ─────────────────
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { tickets, loading, refetch: fetchAll };
}
