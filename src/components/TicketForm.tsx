import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { campData } from '../data/campData';
import type { PendingTicket } from '../hooks/useSync';

type Priority = 'low' | 'normal' | 'high' | 'critical';

interface Props {
  creatorName: string;
  isOnline: boolean;
  queueTicket: (ticket: Omit<PendingTicket, 'localId' | 'queued_at'>) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low',      label: '⬇️ Low',      color: '#94a3b8' },
  { value: 'normal',   label: '➡️ Normal',   color: '#60a5fa' },
  { value: 'high',     label: '⬆️ High',     color: '#fbbf24' },
  { value: 'critical', label: '🚨 Critical', color: '#fb7185' },
];

const locationOptions = Array.from(
  new Map(
    campData.map(item => [`${item.loc} — ${item.block}`, `${item.loc} — ${item.block}`])
  ).values()
).sort();

function getRoomsForLocation(loc: string) {
  return campData
    .filter(item => `${item.loc} — ${item.block}` === loc)
    .map(item => ({ value: item.room, label: `Room ${item.room} — ${item.dept}` }));
}

export default function TicketForm({ creatorName, isOnline, queueTicket }: Props) {
  const [description, setDescription]     = useState('');
  const [location, setLocation]           = useState(locationOptions[0]);
  const [room, setRoom]                   = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [priority, setPriority]           = useState<Priority>('normal');
  const [submitting, setSubmitting]       = useState(false);
  const [success, setSuccess]             = useState<'synced' | 'queued' | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  const roomOptions = useMemo(() => getRoomsForLocation(location), [location]);

  function handleLocationChange(newLoc: string) {
    setLocation(newLoc);
    setRoom('');
  }

  function resetForm() {
    setDescription('');
    setRoom('');
    setContactNumber('');
    setPriority('normal');
    setTimeout(() => setSuccess(null), 5000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const fullLocation    = room ? `${location} — Room ${room}` : location;
    const fullDescription = contactNumber.trim()
      ? `${description.trim()}\n[Contact: ${contactNumber.trim()}]`
      : description.trim();

    const payload = {
      issue_description: fullDescription,
      location:          fullLocation,
      status:            'open' as const,
      priority,
      creator_name:      creatorName,
    };

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!isOnline) {
      queueTicket(payload);
      setSubmitting(false);
      setSuccess('queued');
      resetForm();
      return;
    }

    const { error: dbError } = await supabase.from('tickets').insert(payload);
    setSubmitting(false);
    if (dbError) {
      queueTicket(payload);
      setSuccess('queued');
    } else {
      setSuccess('synced');
    }
    resetForm();
  }

  const selPriority = PRIORITY_OPTIONS.find(p => p.value === priority)!;

  return (
    <div className="staff-section">
      <h3 className="staff-section-title">📋 Report an Issue</h3>
      <form onSubmit={handleSubmit} className="ticket-form">

        <label className="field-label">Location</label>
        <select value={location} onChange={e => handleLocationChange(e.target.value)} className="ticket-select">
          {locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        {roomOptions.length > 0 && (
          <>
            <label className="field-label">Room <span className="field-optional">(optional)</span></label>
            <select value={room} onChange={e => setRoom(e.target.value)} className="ticket-select">
              <option value="">— Select a room —</option>
              {roomOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </>
        )}

        <label className="field-label">Contact Number <span className="field-optional">(optional)</span></label>
        <input
          type="tel"
          value={contactNumber}
          onChange={e => setContactNumber(e.target.value)}
          placeholder=""
          className="ticket-select"
        />

        <label className="field-label">Issue Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the issue…"
          rows={3}
          className="ticket-textarea"
          required
        />

        <label className="field-label">Priority</label>
        <div className="priority-row">
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`priority-btn${priority === opt.value ? ' active' : ''}`}
              style={priority === opt.value
                ? { borderColor: opt.color, color: opt.color, background: `${opt.color}22` }
                : {}}
              onClick={() => setPriority(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && <p className="ticket-error">{error}</p>}
        {success === 'synced' && <p className="ticket-success">✅ Ticket submitted!</p>}
        {success === 'queued' && <p className="ticket-queued">🟡 Saved locally — will sync when online.</p>}

        <div className="form-footer">
          <span className="priority-preview" style={{ color: selPriority.color }}>{selPriority.label} priority</span>
          <button type="submit" className="ticket-submit-btn" disabled={submitting || !description.trim()}>
            {submitting ? 'Submitting…' : isOnline ? 'Submit Ticket' : 'Queue Ticket (Offline)'}
          </button>
        </div>
      </form>
    </div>
  );
}
