import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Eye, EyeOff, ArrowLeftRight, Dice5, Landmark,
  Wallet, Target, Ban, ShieldCheck, Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useHomeData from '../hooks/useHomeData';
import { formatCurrency, formatSigned, formatMovementDate, getInitials } from '../utils/format';

import NotificationsBell from '../components/ui/NotificationsBell';

const CATEGORY = {
  ingreso_manual: { label: 'Ingreso', icon: Wallet },
  bizum: { label: 'Bizum', icon: ArrowLeftRight },
  prediccion: { label: 'Predicción', icon: Target },
  apuesta: { label: 'Apuesta', icon: Dice5 },
  prestamo: { label: 'Préstamo', icon: Landmark },
  penalizacion: { label: 'Penalización', icon: Ban },
  ajuste_admin: { label: 'Ajuste', icon: ShieldCheck },
};

const ACTIONS = [
  { to: '/bizum', label: 'Bizum', icon: ArrowLeftRight },
  { to: '/apuestas', label: 'Apuestas', icon: Dice5 },
  { to: '/prestamos', label: 'Préstamo', icon: Landmark },
];

function MovementRow({ m }) {
  const cfg = CATEGORY[m.category] ?? { label: 'Movimiento', icon: Receipt };
  const Icon = cfg.icon;
  const income = m.type === 'income';

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          income ? 'bg-positive/15 text-positive' : 'bg-surface-2 text-ink'
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.description || cfg.label}</p>
        <p className="text-xs text-muted">
          {cfg.label} · {formatMovementDate(m.created_at)}
        </p>
      </div>
      <p className={`font-display text-sm font-semibold ${income ? 'text-positive' : 'text-ink'}`}>
        {formatSigned(m.type, m.amount)}
      </p>
    </li>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-44 rounded-3xl bg-surface" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-3xl bg-surface" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-surface" />
    </div>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const { account, movements, pendingRequests, loading, error, reload } = useHomeData();
  const [hidden, setHidden] = useState(false);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex items-center justify-between">
        <Link to="/ajustes" className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-semibold text-white"
            style={{ backgroundColor: profile?.avatar_color || '#6D4AFF' }}
          >
            {getInitials(profile?.full_name)}
          </div>
          <div>
            <p className="text-xs text-muted">Hola,</p>
            <p className="font-display text-base font-semibold leading-tight">
              {profile?.full_name?.split(' ')[0] ?? ''}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link
            to="/contactos"
            aria-label="Contactos"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface transition hover:bg-surface-2"
          >
            <Users size={20} />
            {pendingRequests > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">
                {pendingRequests > 9 ? '9+' : pendingRequests}
              </span>
            )}
          </Link>
        </div>
      </header>

      {loading && <HomeSkeleton />}

      {!loading && error && (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-negative">{error}</p>
          <button
            onClick={reload}
            className="mt-4 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && account && (
        <>
          {/* Tarjeta de saldo */}
          <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{profile?.full_name}</span>
                <span className="text-xs text-muted">{account.account_number}</span>
              </div>

              <p className="mt-8 text-xs uppercase tracking-widest text-muted">Saldo total</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-display text-4xl font-semibold tracking-tight">
                  {hidden ? '••••••' : formatCurrency(account.balance)}
                </p>
                <button
                  onClick={() => setHidden((h) => !h)}
                  aria-label={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
                  className="text-muted transition hover:text-ink"
                >
                  {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </section>

          {/* Accesos rápidos */}
          <section className="grid grid-cols-3 gap-3">
            {ACTIONS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface py-4 text-sm font-medium transition hover:bg-surface-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent">
                  <Icon size={20} />
                </span>
                {label}
              </Link>
            ))}
          </section>

          {/* Últimos movimientos */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Últimos movimientos</h2>
            {movements.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">
                Aún no tienes movimientos.
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {movements.map((m) => (
                  <MovementRow key={m.id} m={m} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}