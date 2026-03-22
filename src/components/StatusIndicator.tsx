import { useEffect, useState } from 'react';

interface Props {
  isSyncing?: boolean;
  pendingCount?: number;
}

type Status = 'online' | 'offline' | 'syncing';

export default function StatusIndicator({ isSyncing = false, pendingCount = 0 }: Props) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  let status: Status = isOnline ? 'online' : 'offline';
  if (isOnline && isSyncing) status = 'syncing';

  const label =
    status === 'syncing' ? `Syncing (${pendingCount})` :
    status === 'online'  ? 'Online' :
    'Offline';

  return (
    <span className={`status-indicator status-${status}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}
