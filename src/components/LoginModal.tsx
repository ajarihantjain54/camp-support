import { useState } from 'react';

interface Props {
  onLogin: (pin: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function LoginModal({ onLogin, loading, error, onClose }: Props) {
  const [pin, setPin] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    await onLogin(pin);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose} aria-label="Close">&times;</button>
        <h2 className="login-title">🔐 Staff Login</h2>
        <p className="login-subtitle">Enter your staff PIN to access the portal</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            inputMode="text"
            maxLength={8}
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            className="pin-input"
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <button
            type="submit"
            className="login-btn"
            disabled={loading || !pin.trim()}
          >
            {loading ? 'Verifying…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
