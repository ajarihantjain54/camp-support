import { useState } from 'react';
import { type TicketRow } from '../lib/supabase';
import type { PendingTicket } from '../hooks/useSync';

interface Props {
  tickets: TicketRow[];
  loading: boolean;
  pending: PendingTicket[];
  onRefresh: () => void;
  staffName: string;
  updateTicketOptimistic: (id: number, updates: Partial<TicketRow>) => Promise<boolean>;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#fb7185', pending: '#fbbf24', resolved: '#4ade80', queued: '#a78bfa',
};
const STATUS_ICONS: Record<string, string> = {
  open: '🔴', pending: '🟡', resolved: '🟢', queued: '🟣',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8', normal: '#60a5fa', high: '#fbbf24', critical: '#fb7185',
};
const PRIORITY_ICONS: Record<string, string> = {
  low: '⬇️', normal: '➡️', high: '⬆️', critical: '🚨',
};
const PRIORITY_ORDER = ['low', 'normal', 'high', 'critical'] as const;

export default function TicketList({ tickets, loading, pending, onRefresh, staffName, updateTicketOptimistic }: Props) {
  const [escalating, setEscalating] = useState<number | null>(null);
  const openPending = tickets.filter(t => t.status !== 'resolved');
  const total = pending.length + openPending.length;

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async function escalatePriority(ticket: TicketRow) {
    const idx = PRIORITY_ORDER.indexOf(ticket.priority as any);
    if (idx >= PRIORITY_ORDER.length - 1) return;
    const next = PRIORITY_ORDER[idx + 1];
    
    setEscalating(ticket.id);
    await updateTicketOptimistic(ticket.id, { priority: next as any });
    setEscalating(null);
  }

  return (
    <div className="staff-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="staff-section-title" style={{ margin: 0 }}>🎫 Open / Pending Tickets</h3>
        <button className="refresh-btn" onClick={onRefresh}>↻ Refresh</button>
      </div>

      {loading && tickets.length === 0 ? (
        <p className="ticket-meta">Loading…</p>
      ) : total === 0 ? (
        <p className="ticket-meta">No open or pending tickets. 🎉</p>
      ) : (
        <div className="ticket-list">
          {pending.map(ticket => (
            <div key={ticket.localId} className="ticket-card ticket-card-pending-sync">
              <div className="ticket-card-header">
                <span className="ticket-status-badge" style={{ background: STATUS_COLORS['queued'] }}>
                  {STATUS_ICONS['queued']} PENDING SYNC
                </span>
                <span className="priority-chip" style={{ borderColor: PRIORITY_COLORS[ticket.priority], color: PRIORITY_COLORS[ticket.priority] }}>
                  {PRIORITY_ICONS[ticket.priority]} {ticket.priority}
                </span>
                <span className="ticket-meta">{timeAgo(ticket.queued_at)}</span>
              </div>
              <p className="ticket-description">{ticket.issue_description}</p>
              <p className="ticket-location">📍 {ticket.location}</p>
            </div>
          ))}
          {openPending.map(ticket => {
            const isOwner = ticket.creator_name === staffName;
            const canEscalate = isOwner && ticket.status !== 'resolved' && ticket.priority !== 'critical';
            return (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-card-header">
                  <span className="ticket-status-badge" style={{ background: STATUS_COLORS[ticket.status] }}>
                    {STATUS_ICONS[ticket.status]} {ticket.status.toUpperCase()}
                  </span>
                  <span className="priority-chip" style={{ borderColor: PRIORITY_COLORS[ticket.priority], color: PRIORITY_COLORS[ticket.priority] }}>
                    {PRIORITY_ICONS[ticket.priority]} {ticket.priority}
                  </span>
                  <span className="ticket-meta">{timeAgo(ticket.created_at)}</span>
                </div>
                <p className="ticket-description">{ticket.issue_description}</p>
                <p className="ticket-location">📍 {ticket.location}</p>
                {ticket.assigned_to && <p className="ticket-meta">👤 {ticket.assigned_to}</p>}
                {canEscalate && (
                  <button
                    className="escalate-btn"
                    disabled={escalating === ticket.id}
                    onClick={() => escalatePriority(ticket)}
                  >
                    {escalating === ticket.id ? 'Escalating…' : '🔺 Escalate Priority — Not Resolved'}
                  </button>
                )}
                {isOwner && ticket.priority === 'critical' && ticket.status !== 'resolved' && (
                  <p className="ticket-meta" style={{ color: '#fb7185', marginTop: 6 }}>🚨 Already at Critical priority</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
