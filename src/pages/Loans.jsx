import { useCallback, useEffect, useState } from 'react';
import { Clock, Ban, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import useLoans from '../hooks/useLoans';
import { formatCurrency, formatRemaining, formatDate, formatDateTime } from '../utils/format';

const round2 = (n) => Math.round(n * 100) / 100;
const pendingOf = (loan) => round2(Number(loan.amount_due) - Number(loan.amount_paid));

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm ${strong ? 'font-display text-base font-semibold' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

function ActiveLoanCard({ loan, now, balance, busy, onRepay }) {
  const start = new Date(loan.created_at).getTime();
  const end = new Date(loan.due_date).getTime();
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const overdue = end <= now;
  const urgent = end - now < 86400000;
  const due = Number(loan.amount_due);
  const canPay = balance >= due;

  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted">Debes devolver</p>
          <p className="font-display text-2xl font-semibold tracking-tight">{formatCurrency(due)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Recibiste</p>
          <p className="text-sm font-medium">{formatCurrency(loan.amount)}</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${urgent ? 'bg-negative' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${urgent ? 'text-negative' : 'text-muted'}`}>
          <Clock size={13} />
          {overdue ? 'Vencido, procesando...' : `Vence en ${formatRemaining(loan.due_date, now)}`}
        </span>
        <span className="text-muted">{formatDate(loan.due_date)}</span>
      </div>

      <button
        disabled={!canPay || busy}
        onClick={() => onRepay(loan)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
      >
        Devolver ahora
      </button>
      {!canPay && (
        <p className="mt-2 text-center text-xs text-muted">
          Te faltan {formatCurrency(due - balance)} para poder devolverlo.
        </p>
      )}
    </div>
  );
}

function DebtCard({ loan, balance, busy, onPay }) {
  const due = Number(loan.amount_due);
  const paid = Number(loan.amount_paid);
  const pending = pendingOf(loan);
  const pct = due > 0 ? Math.min(100, (paid / due) * 100) : 0;
  const canPay = balance >= pending;

  return (
    <div className="rounded-3xl border border-negative/40 bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted">Deuda pendiente</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-negative">
            {formatCurrency(pending)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Préstamo original</p>
          <p className="text-sm font-medium">{formatCurrency(due)}</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        Pagado {formatCurrency(paid)} de {formatCurrency(due)} · venció el {formatDate(loan.due_date)}
      </p>

      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
        <AlertTriangle size={15} className="mt-px shrink-0 text-negative" />
        Se descuenta automáticamente de cada ingreso que recibas (Bizums, ingresos, premios...)
        hasta cubrirla.
      </p>

      <button
        disabled={!canPay || busy}
        onClick={() => onPay(loan)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
      >
        Pagar deuda ahora
      </button>
      {!canPay && (
        <p className="mt-2 text-center text-xs text-muted">
          Te faltan {formatCurrency(pending - balance)} para poder saldarla de golpe.
        </p>
      )}
    </div>
  );
}

function HistoryRow({ loan }) {
  const late = loan.repaid_at && new Date(loan.repaid_at) > new Date(loan.due_date);
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
        <CheckCircle2 size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Préstamo de {formatCurrency(loan.amount)}</p>
        <p className="text-xs text-muted">
          {formatDate(loan.created_at)} · {formatCurrency(loan.amount_due)}
          {late ? ' · con retraso' : ''}
        </p>
      </div>
      <span className="rounded-full bg-positive/15 px-2.5 py-1 text-[11px] font-semibold text-positive">
        Devuelto
      </span>
    </li>
  );
}

export default function Loans() {
  const {
    active, debts, history, totalDebt, balance, blockedUntil, settings,
    loading, error, reload, requestLoan, repayLoan,
  } = useLoans();
  const now = useNow();

  const [requestOpen, setRequestOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');

  const [repayTarget, setRepayTarget] = useState(null);
  const [repaying, setRepaying] = useState(false);
  const [repayError, setRepayError] = useState('');

  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Si un préstamo vence con la página abierta, pedimos al servidor que lo procese
  const hasOverdue = active.some((l) => new Date(l.due_date).getTime() <= now);
  useEffect(() => {
    if (hasOverdue) reload();
  }, [hasOverdue, reload]);

  const closeRequest = useCallback(() => setRequestOpen(false), []);
  const closeRepay = useCallback(() => setRepayTarget(null), []);

  const hasDebt = totalDebt > 0;
  const blocked = blockedUntil && new Date(blockedUntil).getTime() > now;
  const unavailable = settings && (settings.amount <= 0 || settings.durationDays <= 0);
  const maxReached = settings && active.length >= settings.maxActive;
  const canRequest = !!settings && !hasDebt && !blocked && !unavailable && !maxReached;

  const reasons = [];
  if (hasDebt)
    reasons.push(`Tienes una deuda pendiente de ${formatCurrency(totalDebt)}. Sáldala para poder pedir otro préstamo.`);
  if (blocked)
    reasons.push(`Solicitudes bloqueadas por impago hasta el ${formatDateTime(blockedUntil)}.`);
  if (unavailable) reasons.push('Los préstamos no están disponibles ahora mismo.');
  else if (maxReached)
    reasons.push(`Has alcanzado el máximo de préstamos activos (${settings.maxActive}). Devuelve alguno para pedir otro.`);

  const dueAmount = settings
    ? Math.round(settings.amount * (1 + settings.interest / 100) * 100) / 100
    : 0;

  const repayAmount = repayTarget ? pendingOf(repayTarget) : 0;
  const repayIsDebt = repayTarget?.status === 'defaulted';

  function openRequest() {
    setRequestError('');
    setRequestOpen(true);
  }

  async function handleRequest() {
    setRequesting(true);
    setRequestError('');
    const res = await requestLoan();
    setRequesting(false);
    if (!res.ok) {
      setRequestError(res.message);
      return;
    }
    setRequestOpen(false);
    setNotice(`Has recibido ${formatCurrency(settings.amount)} en tu cuenta`);
  }

  function openRepay(loan) {
    setRepayError('');
    setRepayTarget(loan);
  }

  async function handleRepay() {
    setRepaying(true);
    setRepayError('');
    const res = await repayLoan(repayTarget.id);
    setRepaying(false);
    if (!res.ok) {
      setRepayError(res.message);
      return;
    }
    const paid = repayAmount;
    setRepayTarget(null);
    setNotice(`${repayIsDebt ? 'Deuda saldada' : 'Préstamo devuelto'} (${formatCurrency(paid)})`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Préstamos</h1>
        <p className="mt-1 text-sm text-muted">
          Saldo disponible: <span className="font-medium text-ink">{formatCurrency(balance)}</span>
        </p>
      </header>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-3xl bg-surface" />
          <div className="h-40 rounded-3xl bg-surface" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-negative">{error}</p>
          <button
            onClick={reload}
            className="mt-4 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && settings && (
        <>
          {/* Oferta */}
          <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-widest text-muted">Préstamo disponible</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight">
                {formatCurrency(settings.amount)}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <Stat label="Interés" value={`${settings.interest}%`} />
                <Stat label="Devuelves" value={formatCurrency(dueAmount)} />
                <Stat label="Plazo" value={`${settings.durationDays} días`} />
              </div>

              {reasons.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
                  {reasons.map((r) => (
                    <p key={r} className="flex items-start gap-2">
                      <Ban size={15} className="mt-px shrink-0" />
                      {r}
                    </p>
                  ))}
                </div>
              )}

              <button
                disabled={!canRequest}
                onClick={openRequest}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
              >
                Solicitar préstamo
              </button>
            </div>
          </section>

          {/* Deudas pendientes */}
          {debts.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold">Deuda pendiente</h2>
              <div className="space-y-3">
                {debts.map((l) => (
                  <DebtCard
                    key={l.id}
                    loan={l}
                    balance={balance}
                    busy={repaying && repayTarget?.id === l.id}
                    onPay={openRepay}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Activos */}
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold">Préstamos activos</h2>
              <div className="space-y-3">
                {active.map((l) => (
                  <ActiveLoanCard
                    key={l.id}
                    loan={l}
                    now={now}
                    balance={balance}
                    busy={repaying && repayTarget?.id === l.id}
                    onRepay={openRepay}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Historial */}
          <section>
            <h2 className="mb-3 font-display text-base font-semibold">Historial</h2>
            {history.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">
                Aún no has cerrado ningún préstamo.
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {history.map((l) => (
                  <HistoryRow key={l.id} loan={l} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Modal: solicitar */}
      <Modal open={requestOpen} onClose={closeRequest} title="Solicitar préstamo">
        {settings && (
          <div>
            <div className="divide-y divide-line">
              <SummaryRow label="Recibes ahora" value={formatCurrency(settings.amount)} />
              <SummaryRow label={`Interés (${settings.interest}%)`} value={formatCurrency(dueAmount - settings.amount)} />
              <SummaryRow label="Tendrás que devolver" value={formatCurrency(dueAmount)} strong />
              <SummaryRow
                label="Fecha límite"
                value={formatDate(new Date(Date.now() + settings.durationDays * 86400000))}
              />
            </div>

            <div className="mt-4 flex gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-xs text-muted">
              <AlertTriangle size={16} className="mt-px shrink-0 text-negative" />
              <p>
                Al vencer el plazo se descontará de tu saldo automáticamente. Si no tienes saldo
                suficiente, la deuda seguirá viva y se descontará de tus próximos ingresos, y no
                podrás pedir más préstamos durante {settings.penaltyDays} días.
              </p>
            </div>

            {requestError && <p className="mt-3 text-sm text-negative">{requestError}</p>}

            <button
              onClick={handleRequest}
              disabled={requesting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
            >
              {requesting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar préstamo'}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal: devolver / pagar deuda */}
      <Modal
        open={!!repayTarget}
        onClose={closeRepay}
        title={repayIsDebt ? 'Pagar deuda' : 'Devolver préstamo'}
      >
        {repayTarget && (
          <div>
            <div className="divide-y divide-line">
              <SummaryRow label="Importe a pagar" value={formatCurrency(repayAmount)} strong />
              <SummaryRow label="Saldo actual" value={formatCurrency(balance)} />
              <SummaryRow label="Saldo tras pagarlo" value={formatCurrency(balance - repayAmount)} />
            </div>

            {repayError && <p className="mt-3 text-sm text-negative">{repayError}</p>}

            <button
              onClick={handleRepay}
              disabled={repaying}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
            >
              {repaying ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar pago'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}