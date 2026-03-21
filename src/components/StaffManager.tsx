import { useState, useEffect } from 'react';
import { supabase, type StaffRow } from '../lib/supabase';

export default function StaffManager() {
  const [staff,      setStaff]      = useState<StaffRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Set<number>>(new Set());

  function togglePin(id: number) {
    setRevealedPins(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const [name,          setName]          = useState('');
  const [pin,           setPin]           = useState('');
  const [contactNumber, setContactNumber] = useState('');

  async function fetchStaff() {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });
    setStaff((data as StaffRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchStaff(); }, []);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: dbError } = await supabase.from('staff').insert({
      name:           name.trim(),
      pin_access:     pin.trim(),
      contact_number: contactNumber.trim() || null,
    });

    setSubmitting(false);
    if (dbError) {
      setError(dbError.message.includes('unique') ? 'That PIN is already in use.' : dbError.message);
    } else {
      setSuccess(true);
      setName(''); setPin(''); setContactNumber('');
      setShowForm(false);
      fetchStaff();
      setTimeout(() => setSuccess(false), 4000);
    }
  }

  return (
    <div className="staff-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="staff-section-title" style={{ margin: 0 }}>👥 Team Members</h3>
        <button className="refresh-btn" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Onboard'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleOnboard} className="ticket-form" style={{ marginBottom: 20 }}>
          <label className="field-label">Full Name</label>
          <input
            className="ticket-select"
            placeholder="e.g., Dr. Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <label className="field-label">Assign PIN</label>
          <input
            className="ticket-select"
            type="password"
            inputMode="numeric"
            maxLength={8}
            placeholder="4–8 digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            required
          />
          <label className="field-label">Contact Number <span className="field-optional">(optional)</span></label>
          <input
            className="ticket-select"
            type="tel"
            placeholder=""
            value={contactNumber}
            onChange={e => setContactNumber(e.target.value)}
          />
          {error && <p className="ticket-error">{error}</p>}
          <button
            type="submit"
            className="ticket-submit-btn"
            disabled={submitting || !name.trim() || !pin.trim()}
          >
            {submitting ? 'Adding…' : 'Add Staff Member'}
          </button>
        </form>
      )}

      {success && <p className="ticket-success" style={{ marginBottom: 12 }}>✅ Staff member added!</p>}

      {loading ? (
        <p className="ticket-meta">Loading…</p>
      ) : (
        <div className="staff-list">
          {staff.map(member => (
            <div key={member.id} className="staff-row">
              <div className="staff-row-info">
                <span className="staff-row-name">{member.name}</span>
                {member.contact_number && (
                  <span className="staff-row-contact">📞 {member.contact_number}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="staff-row-pin" style={{ fontFamily: 'monospace', minWidth: 60 }}>
                  {revealedPins.has(member.id)
                    ? member.pin_access
                    : '•'.repeat(member.pin_access.length)}
                </span>
                <button
                  className="pin-toggle-btn"
                  onClick={() => togglePin(member.id)}
                  title={revealedPins.has(member.id) ? 'Hide PIN' : 'Show PIN'}
                >
                  {revealedPins.has(member.id) ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
