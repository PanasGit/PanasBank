import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Users, ArrowLeftRight, Landmark, Target, Dice5, Info } from 'lucide-react';
import Modal from './Modal';
import useNotifications from '../../hooks/useNotifications';
import { formatMovementDate } from '../../utils/format';

const TYPE_CONFIG = {
  friend_request: { icon: Users, path: '/contactos' },
  friend_accepted: { icon: Users, path: '/contactos' },
  bizum: { icon: ArrowLeftRight, path: '/bizum' },
  loan: { icon: Landmark, path: '/prestamos' },
  prediction: { icon: Target, path: '/apuestas' },
  bet: { icon: Dice5, path: '/apuestas' },
};

export default function NotificationsBell() {
  const { notifications, unreadCount, loading, error, open } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  async function handleOpen() {
    setModalOpen(true);
    await open();
  }

  function handleItemClick(n) {
    setModalOpen(false);
    const cfg = TYPE_CONFIG[n.type];
    if (cfg) navigate(cfg.path);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface transition hover:bg-surface-2"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Notificaciones">
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        )}

        {!loading && error && <p className="text-sm text-negative">{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No tienes notificaciones.</p>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="-mx-2 max-h-96 space-y-1 overflow-y-auto">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg?.icon ?? Info;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2 ${
                      !n.read ? 'bg-accent/5' : ''
                    }`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      </span>
                      <span className="block truncate text-xs text-muted">{n.body}</span>
                      <span className="block text-[11px] text-muted">{formatMovementDate(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}