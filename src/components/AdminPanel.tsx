import { useState } from 'react';
import { type TicketRow } from '../lib/supabase';

interface Props {
  tickets: TicketRow[];
  staffName: string;
  updateTicketOptimistic: (id: number, updates: Partial<TicketRow>) => Promise<boolean>;
}

const STATUS_ORDER: TicketRow['status'][] = ['open', 'pending', 'resolved'];
const PRIORITY_ORDER: TicketRow['priority'][] = ['low', 'normal', 'high', 'critical'];

const STATUS_COLORS:   Record<string, string> = { open: '#fb7185', pending: '#fbbf24', resolved: '#4ade80' };
const STATUS_ICONS:    Record<string, string> = { open: '🔴', pending: '🟡', resolved: '🟢' };
const PRIORITY_COLORS: Record<string, string> = { low: '#94a3b8', normal: '#60a5fa', high: '#fbbf24', critical: '#fb7185' };
const PRIORITY_ICONS:  Record<string, string> = { low: '⬇️', normal: '➡️', high: '⬆️', critical: '🚨' };

export default function AdminPanel({ tickets, staffName, updateTicketOptimistic }: Props) {
  const [updating,     setUpdating]     = useState<number | null>(null);
  const [assigning,    setAssigning]    = useState<number | null>(null);
  const [assignInput,  setAssignInput]  = useState('');

  async function cycleStatus(ticket: TicketRow) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(ticket.status) + 1) % STATUS_ORDER.length];
    setUpdating(ticket.id);
    await updateTicketOptimistic(ticket.id, { status: next });
    setUpdating(null);
  }

  async function cyclePriority(ticket: TicketRow) {
    const next = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(ticket.priority) + 1) % PRIORITY_ORDER.length];
    setUpdating(ticket.id);
    await updateTicketOptimistic(ticket.id, { priority: next });
    setUpdating(null);
  }

  async function assignTicket(ticketId: number) {
    const name = assignInput.trim() || staffName;
    setUpdating(ticketId);
    await updateTicketOptimistic(ticketId, { assigned_to: name });
    setUpdating(null);
    setAssigning(null);
    setAssignInput('');
  }

  const openPending = tickets.filter(t => t.status !== 'resolved');
  const resolved    = tickets.filter(t => t.status === 'resolved');

  return (
    <div className="staff-section">
      <h3 className="staff-section-title">⚙️ Admin Controls</h3>

      {openPending.length === 0 && resolved.length === 0 && (
        <p className="ticket-meta">No tickets yet.</p>
      )}

      {openPending.length > 0 && (
        <div className="ticket-list" style={{ marginBottom: 16 }}>
          {openPending.map(ticket => (
            <div key={ticket.id} className="ticket-card admin-card">
              <div className="admin-card-top">
                <span className="ticket-status-badge" style={{ background: STATUS_COLORS[ticket.status] }}>
                  {STATUS_ICONS[ticket.status]} {ticket.status.toUpperCase()}
                </span>
                <span className="priority-chip" style={{ borderColor: PRIORITY_COLORS[ticket.priority], color: PRIORITY_COLORS[ticket.priority] }}>
                  {PRIORITY_ICONS[ticket.priority]} {ticket.priority}
                </span>
                <p className="ticket-description" style={{ margin: '0 0 0 10px', flex: 1 }}>
                  {ticket.issue_description}
                </p>
              </div>

              <p className="ticket-location" style={{ marginTop: 8 }}>📍 {ticket.location}</p>
              {ticket.assigned_to && (
                <p className="ticket-meta">👤 Assigned to: <strong>{ticket.assigned_to}</strong></p>
              )}

              <div className="admin-actions">
                {/* Cycle status */}
                <button
                  className="admin-btn admin-btn-status"
                  style={{ borderColor: STATUS_COLORS[ticket.status], color: STATUS_COLORS[ticket.status] }}
                  disabled={updating === ticket.id}
                  onClick={() => cycleStatus(ticket)}
                >
                  {updating === ticket.id ? '…' : `→ ${STATUS_ORDER[(STATUS_ORDER.indexOf(ticket.status) + 1) % STATUS_ORDER.length].toUpperCase()}`}
                </button>

                {/* Cycle priority */}
                <button
                  className="admin-btn admin-btn-status"
                  style={{ borderColor: PRIORITY_COLORS[ticket.priority], color: PRIORITY_COLORS[ticket.priority] }}
                  disabled={updating === ticket.id}
                  onClick={() => cyclePriority(ticket)}
                >
                  {PRIORITY_ICONS[ticket.priority]} → {PRIORITY_ICONS[PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(ticket.priority) + 1) % PRIORITY_ORDER.length]]}
                </button>

                {/* Assign */}
                {assigning === ticket.id ? (
                  <div className="assign-row">
                    <input
                      className="assign-input"
                      placeholder={`Assign to (default: ${staffName})`}
                      value={assignInput}
                      onChange={e => setAssignInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && assignTicket(ticket.id)}
                      autoFocus
                    />
                    <button className="admin-btn admin-btn-confirm" onClick={() => assignTicket(ticket.id)}>✓</button>
                    <button className="admin-btn admin-btn-cancel" onClick={() => { setAssigning(null); setAssignInput(''); }}>✕</button>
                  </div>
                ) : (
                  <button className="admin-btn admin-btn-assign" onClick={() => setAssigning(ticket.id)}>
                    👤 Assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="resolved-section">
          <summary className="resolved-summary">✅ Resolved ({resolved.length})</summary>
          <div className="ticket-list" style={{ marginTop: 10 }}>
            {resolved.map(ticket => (
              <div key={ticket.id} className="ticket-card" style={{ opacity: 0.6 }}>
                <div className="admin-card-top">
                  <span className="ticket-status-badge" style={{ background: STATUS_COLORS['resolved'] }}>🟢 RESOLVED</span>
                  <span className="priority-chip" style={{ borderColor: PRIORITY_COLORS[ticket.priority], color: PRIORITY_COLORS[ticket.priority] }}>
                    {PRIORITY_ICONS[ticket.priority]} {ticket.priority}
                  </span>
                  <p className="ticket-description" style={{ margin: '0 0 0 10px', flex: 1 }}>{ticket.issue_description}</p>
                </div>
                <p className="ticket-location" style={{ marginTop: 8 }}>📍 {ticket.location}</p>
                <button
                  className="admin-btn admin-btn-status"
                  style={{ marginTop: 8, borderColor: '#fb7185', color: '#fb7185' }}
                  disabled={updating === ticket.id}
                  onClick={() => cycleStatus(ticket)}
                >
                  {updating === ticket.id ? '…' : '→ REOPEN'}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
