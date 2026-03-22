import { useState, useEffect } from 'react';
import { supabase, type StaffRow } from '../lib/supabase';

interface Props {
  isAdmin: boolean;
}

export default function StaffManager({ isAdmin }: Props) {
  const [staff,      setStaff]      = useState<StaffRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // PIN reset state: which member is being reset, and the new PIN value
  const [resettingId,  setResettingId]  = useState<number | null>(null);
  const [newPin,       setNewPin]       = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<number | null>(null);

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
    if (!isAdmin || !name.trim() || !pin.trim()) return;
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

  async function handleResetPin(memberId: number) {
    if (!isAdmin || !newPin.trim()) return;
    setResetLoading(true);
    setResetError(null);

    // Updating pin_access fires the bcrypt trigger server-side
    const { error: dbError } = await supabase
      .from('staff')
      .update({ pin_access: newPin.trim() })
      .eq('id', memberId);

    setResetLoading(false);
    if (dbError) {
      setResetError(dbError.message.includes('unique') ? 'That PIN is already in use.' : dbError.message);
    } else {
      setResetSuccess(memberId);
      setResettingId(null);
      setNewPin('');
      fetchStaff();
      setTimeout(() => setResetSuccess(null), 3000);
    }
  }

  return (
    <div className="staff-section">
      {!isAdmin && (
        <p className="ticket-meta" style={{ color: '#fb7185' }}>⛔ Admin access required.</p>
      )}
      {isAdmin && (
      <>
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

      {success && <p className="ticket-success" style={{ marginBottom: 12 }}>✅ Staff member added!</p>}

      {loading ? (
        <p className="ticket-meta">Loading…</p>
      ) : (
        <div className="staff-list">
          {staff.map(member => (
            <div key={member.id} className="staff-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="staff-row-info">
                  <span className="staff-row-name">{member.name}</span>
                  {member.is_admin && (
                    <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 6 }}>⭐ Admin</span>
                  )}
                  {member.contact_number && (
                    <span className="staff-row-contact">📞 {member.contact_number}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {resetSuccess === member.id && (
                    <span style={{ fontSize: 12, color: '#4ade80' }}>✅ PIN updated</span>
                  )}
                  <button
                    className="pin-toggle-btn"
                    onClick={() => {
                      setResettingId(resettingId === member.id ? null : member.id);
                      setNewPin('');
                      setResetError(null);
                    }}
                    title="Reset PIN"
                  >
                    🔑 Reset PIN
                  </button>
                </div>
              </div>

              {resettingId === member.id && (
                <div className="assign-row" style={{ marginTop: 4 }}>
                  <input
                    className="assign-input"
                    type="password"
                    inputMode="text"
                    maxLength={8}
                    placeholder="New PIN (4–8 chars)"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleResetPin(member.id)}
                    autoFocus
                  />
                  <button
                    className="admin-btn admin-btn-confirm"
                    disabled={resetLoading || !newPin.trim()}
                    onClick={() => handleResetPin(member.id)}
                  >
                    {resetLoading ? '…' : '✓'}
                  </button>
                  <button
                    className="admin-btn admin-btn-cancel"
                    onClick={() => { setResettingId(null); setNewPin(''); setResetError(null); }}
                  >
                    ✕
                  </button>
                  {resetError && <span style={{ fontSize: 12, color: '#fb7185' }}>{resetError}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
