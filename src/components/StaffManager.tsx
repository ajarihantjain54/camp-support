import { useState, useEffect } from 'react';
import { supabase, type StaffRow } from '../lib/supabase';

interface StaffManagerProps { isAdmin: boolean; }
export default function StaffManager({ isAdmin }: StaffManagerProps) {
  if (!isAdmin) return null;
  const [staff,      setStaff]      = useState<StaffRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // For PIN Reset
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [newPin, setNewPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [name,          setName]          = useState('');
  const [pin,           setPin]           = useState('');
  const [contactNumber, setContactNumber] = useState('');

  async function fetchStaff() {
    const { data } = await supabase
      .from('staff')
      .select('id, name, contact_number, is_admin, created_at') // Don't even fetch hashed pins
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
      pin_access:     pin.trim(), // Trigger hashes this
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

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingId || !newPin.trim()) return;
    setIsResetting(true);
    
    const { data, error: rpcError } = await supabase.rpc('reset_staff_pin', {
      staff_id: resettingId,
      new_pin: newPin.trim()
    });

    setIsResetting(false);
    if (rpcError) {
      alert('Error resetting PIN: ' + rpcError.message);
    } else if (data) {
      alert('PIN reset successfully!');
      setResettingId(null);
      setNewPin('');
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
            inputMode="text"
            maxLength={8}
            placeholder="4–8 char PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
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

      {/* PIN Reset Modal/Overlay */}
      {resettingId && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1100 }} onClick={() => setResettingId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24, background: '#1e1e1e', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0 }}>Reset PIN for {staff.find(s => s.id === resettingId)?.name}</h3>
            <form onSubmit={handleResetPin}>
              <label className="field-label">New PIN</label>
              <input
                className="search-box"
                type="password"
                placeholder="Enter new PIN"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="ticket-submit-btn" disabled={isResetting || !newPin.trim()}>
                  {isResetting ? 'Resetting…' : 'Confirm Reset'}
                </button>
                <button type="button" className="refresh-btn" onClick={() => setResettingId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {success && <p className="ticket-success" style={{ marginBottom: 12 }}>✅ Staff member added!</p>}

      {loading ? (
        <p className="ticket-meta">Loading…</p>
      ) : (
        <div className="staff-list">
          {staff.map(member => (
            <div key={member.id} className="staff-row">
              <div className="staff-row-info">
                <span className="staff-row-name">{member.name} {member.is_admin && <span style={{ fontSize: 10, opacity: 0.6 }}>(Admin)</span>}</span>
                {member.contact_number && (
                  <span className="staff-row-contact">📞 {member.contact_number}</span>
                )}
              </div>
              <button
                className="refresh-btn"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => setResettingId(member.id)}
              >
                🔑 Reset PIN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
