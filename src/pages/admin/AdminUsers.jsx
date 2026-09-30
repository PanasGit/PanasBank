import { useState } from 'react';
import { ShieldCheck, Shield, Wallet, Loader2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import useAdminUsers from '../../hooks/useAdminUsers';
import { formatCurrency } from '../../utils/format';

function CreditModal({ user, onClose, onCredit, onAdjust }) {
  const [mode, setMode] = useState('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const n = Number(amount.trim().replace(',', '.'));
    if (!amount.trim() || Number.isNaN(n) || n === 0) return setError('Introduce un importe válido.');
    if (mode === 'credit' && n <= 0) return setError('Los ingresos deben ser positivos.');

    setSaving(true);
    const res =
      mode === 'credit'
        ? await onCredit(user.id, n, description.trim() || undefined)
        : await onAdjust(user.id, n, description.trim() || undefined);
    setSaving(false);

    if (!res.ok) return setError(res.message);
    setAmount('');
    setDescription('');
    onClose();
  }

  return (
    <Modal open={!!user} onClose={onClose} title={`Mover saldo de ${user?.full_name ?? ''}`}>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        <button type="button" onClick={() => setMode('credit')} className={`rounded-xl py-2.5 text-sm font-medium transition ${mode === 'credit' ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
          Ingreso mensual
        </button>
        <button type="button" onClick={() => setMode('adjust')} className={`rounded-xl py-2.5 text-sm font-medium transition ${mode === 'adjust' ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
          Ajuste manual
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Importe (€) {mode === 'adjust' && <span className="font-normal">— usa negativo para restar</span>}
          </label>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === 'adjust' ? '10 o -10' : '0,00'}
            className="w-full rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Descripción (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={mode === 'credit' ? 'Ingreso mensual' : 'Corrección de saldo'}
            className="w-full rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>

        {mode === 'credit' && (
          <p className="text-xs text-muted">
            Este ingreso puede usarse para cobrar deudas de préstamos pendientes del usuario.
          </p>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
        </button>
      </form>
    </Modal>
  );
}

export default function AdminUsers() {
  const { users, loading, error, reload, setRole, creditIncome, adjustBalance } = useAdminUsers();
  const [creditTarget, setCreditTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const visibleUsers = users.filter((u) => u.role !== 'house');

  async function toggleRole(user) {
    const next = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`¿${next === 'admin' ? 'Dar' : 'Quitar'} permisos de administrador a ${user.full_name}?`)) return;
    setBusyId(user.id);
    const res = await setRole(user.id, next);
    setBusyId(null);
    setNotice(res.ok ? `Rol actualizado a ${next}` : res.message);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-muted">{visibleUsers.length} cuentas registradas</p>
      </header>

      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
        Para dar de alta a alguien nuevo, créalo desde Supabase (Authentication → Users) y completa
        su perfil por SQL. Aquí gestionas a quien ya tiene cuenta.
      </p>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      {loading && <div className="h-64 animate-pulse rounded-3xl bg-surface" />}

      {!loading && error && (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-negative">{error}</p>
          <button onClick={reload} className="mt-4 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {visibleUsers.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <Avatar name={u.full_name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {u.full_name}
                  {u.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      <ShieldCheck size={10} /> Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">{u.phone}</p>
              </div>
              <p className="font-display text-sm font-semibold">{formatCurrency(u.account?.balance ?? 0)}</p>

              {busyId === u.id ? (
                <Loader2 size={18} className="animate-spin text-muted" />
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => setCreditTarget(u)} aria-label="Mover saldo" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-accent">
                    <Wallet size={16} />
                  </button>
                  <button onClick={() => toggleRole(u)} aria-label={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-accent">
                    {u.role === 'admin' ? <Shield size={16} /> : <ShieldCheck size={16} />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreditModal user={creditTarget} onClose={() => setCreditTarget(null)} onCredit={creditIncome} onAdjust={adjustBalance} />
    </div>
  );
}