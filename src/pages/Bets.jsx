import { useCallback, useEffect, useState } from 'react';
import { Plus, Target, Dice5, Loader2, Users, Lock, CheckCircle2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import usePredictions from '../hooks/usePredictions';
import useBets from '../hooks/useBets';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatRemaining, formatDateTime } from '../utils/format';

const fieldClass =
  'w-full rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent';

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function parseAmount(raw) {
  const v = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

function Bar({ pct }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------------- PREDICCIONES ---------------- */

function PredictionCard({ prediction: p, totals, myEntry, now, onPick }) {
  const yes = totals?.yes ?? { total: 0, count: 0 };
  const no = totals?.no ?? { total: 0, count: 0 };
  const pot = yes.total + no.total;
  const pctYes = pot > 0 ? (yes.total / pot) * 100 : 50;
  const closed = p.closes_at && new Date(p.closes_at).getTime() <= now;
  const canEnter = !myEntry && !closed;

  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Target size={16} className="text-accent" />
          {p.title}
        </p>
        <span className="shrink-0 text-xs text-muted">{formatCurrency(pot)}</span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{p.option_yes_label} · {Math.round(pctYes)}%</span>
          <span>{p.option_no_label} · {Math.round(100 - pctYes)}%</span>
        </div>
        <Bar pct={pctYes} />
      </div>

      {myEntry ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <CheckCircle2 size={16} className="text-accent" />
          Apostaste {formatCurrency(myEntry.amount)} a{' '}
          <strong>{myEntry.option === 'yes' ? p.option_yes_label : p.option_no_label}</strong>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            disabled={!canEnter}
            onClick={() => onPick(p, 'yes')}
            className="rounded-2xl bg-surface-2 py-2.5 text-sm font-semibold transition hover:bg-accent hover:text-accent-ink disabled:opacity-40"
          >
            {p.option_yes_label}
          </button>
          <button
            disabled={!canEnter}
            onClick={() => onPick(p, 'no')}
            className="rounded-2xl bg-surface-2 py-2.5 text-sm font-semibold transition hover:bg-accent hover:text-accent-ink disabled:opacity-40"
          >
            {p.option_no_label}
          </button>
        </div>
      )}
      {closed && !myEntry && (
        <p className="mt-2 text-center text-xs text-muted">El tiempo para participar ha terminado.</p>
      )}
    </div>
  );
}

function EnterPredictionModal({ target, onClose, onConfirm, balance }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (target) {
      setAmount('');
      setError('');
    }
  }, [target]);

  if (!target) return null;
  const label = target.option === 'yes' ? target.prediction.option_yes_label : target.prediction.option_no_label;

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed) return setError('Introduce un importe válido.');

    setSaving(true);
    const res = await onConfirm(target.prediction.id, target.option, parsed);
    setSaving(false);
    if (!res.ok) return setError(res.message);
  }

  return (
    <Modal open={!!target} onClose={onClose} title={target.prediction.title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Vas a apostar por <strong className="text-ink">{label}</strong>
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Cantidad (€)</label>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={`${fieldClass} font-display text-2xl font-semibold`}
          />
          <p className="mt-1.5 text-xs text-muted">Disponible: {formatCurrency(balance)}</p>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar apuesta'}
        </button>
      </form>
    </Modal>
  );
}

/* ---------------- APUESTAS ---------------- */

function BetCard({ bet, totals, myEntry, now, userId, isAdmin, onEnter, onSettle }) {
  const optTotals = totals ?? {};
  const optionPot = bet.bet_options.reduce((s, o) => s + (optTotals[o.id]?.total ?? 0), 0);
  const pot = optionPot + Number(bet.base_amount);
  const ended = new Date(bet.ends_at).getTime() <= now;
  const isCreator = bet.created_by === userId;
  const canManage = isCreator || isAdmin;
  const canEnter = !myEntry && !ended;
  const winningOption = bet.bet_options.find((o) => o.id === bet.winning_option_id);

  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Dice5 size={16} className="text-accent" />
            {bet.title}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Avatar name={bet.creator?.full_name} color={bet.creator?.avatar_color} size={16} />
            {isCreator ? 'Creada por ti' : bet.creator?.full_name}
          </p>
        </div>
        <span className="shrink-0 font-display text-sm font-semibold">{formatCurrency(pot)}</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {bet.bet_options.map((o) => {
          const t = optTotals[o.id] ?? { total: 0 };
          const pct = optionPot > 0 ? (t.total / optionPot) * 100 : 0;
          const isMine = myEntry?.option_id === o.id;
          const isWinner = bet.status !== 'open' && bet.winning_option_id === o.id;
          return (
            <button
              key={o.id}
              disabled={!canEnter}
              onClick={() => onEnter(bet, o)}
              className={`w-full rounded-2xl border px-3.5 py-2.5 text-left transition disabled:cursor-default ${
                isWinner ? 'border-positive bg-positive/10' : isMine ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-accent'
              } ${canEnter ? '' : 'opacity-90'}`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {o.label} {isMine && '· Tú'}
                </span>
                <span className="text-muted">{formatCurrency(t.total)}</span>
              </div>
              <div className="mt-1.5">
                <Bar pct={pct} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>Mínimo {formatCurrency(bet.min_amount)}</span>
        <span>{ended ? (bet.status === 'open' ? 'Esperando resultado' : 'Cerrada') : `Termina en ${formatRemaining(bet.ends_at, now)}`}</span>
      </div>

      {myEntry && bet.status === 'open' && (
        <p className="mt-3 text-center text-xs text-muted">
          Apostaste {formatCurrency(myEntry.amount)} · en juego
        </p>
      )}

      {bet.status !== 'open' && (
        <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
          {winningOption ? (
            <>Ganó <strong>{winningOption.label}</strong></>
          ) : (
            'Nadie acertó · el bote fue para la banca'
          )}
          {myEntry && Number(myEntry.payout) > 0 && (
            <p className="mt-1 text-positive">Ganaste {formatCurrency(myEntry.payout)}</p>
          )}
        </div>
      )}

      {bet.status === 'open' && canManage && (
        <button
          onClick={() => onSettle(bet)}
          className="mt-4 w-full rounded-2xl border border-line py-2.5 text-sm font-semibold text-muted transition hover:border-negative hover:text-negative"
        >
          Cerrar apuesta
        </button>
      )}
    </div>
  );
}

function EnterBetModal({ target, onClose, onConfirm, balance }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (target) {
      setAmount('');
      setError('');
    }
  }, [target]);

  if (!target) return null;
  const { bet, option } = target;

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (!parsed) return setError('Introduce un importe válido.');
    if (parsed < bet.min_amount) return setError(`La apuesta mínima es de ${formatCurrency(bet.min_amount)}.`);

    setSaving(true);
    const res = await onConfirm(bet.id, option.id, parsed);
    setSaving(false);
    if (!res.ok) return setError(res.message);
  }

  return (
    <Modal open={!!target} onClose={onClose} title={bet.title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Vas a apostar por <strong className="text-ink">{option.label}</strong>
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Cantidad (€)</label>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={formatCurrency(bet.min_amount)}
            className={`${fieldClass} font-display text-2xl font-semibold`}
          />
          <p className="mt-1.5 text-xs text-muted">
            Mínimo {formatCurrency(bet.min_amount)} · Disponible: {formatCurrency(balance)}
          </p>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar apuesta'}
        </button>
      </form>
    </Modal>
  );
}

function SettleBetModal({ bet, totals, onClose, onSettle }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  if (!bet) return null;

  const optTotals = totals ?? {};

  async function handle(optionId) {
    setError('');
    setSaving(optionId);
    const res = await onSettle(bet.id, optionId);
    setSaving(null);
    if (!res.ok) return setError(res.message);
    onClose();
  }

  return (
    <Modal open={!!bet} onClose={onClose} title="Cerrar apuesta">
      <p className="mb-3 text-sm font-medium">{bet.title}</p>
      <div className="space-y-2">
        {bet.bet_options.map((o) => (
          <button
            key={o.id}
            disabled={saving !== null}
            onClick={() => handle(o.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-left transition hover:border-accent disabled:opacity-60"
          >
            <span className="text-sm font-medium">{o.label}</span>
            <span className="flex items-center gap-2 text-sm text-muted">
              {formatCurrency(optTotals[o.id]?.total ?? 0)}
              {saving === o.id && <Loader2 size={16} className="animate-spin" />}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Si eliges una opción sin apuestas, nadie gana y el bote (incluido tu aporte inicial) pasa a la banca.
      </p>
      {error && <p className="mt-3 text-sm text-negative">{error}</p>}
    </Modal>
  );
}

function CreateBetModal({ open, onClose, onCreate, minAmount, balance }) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [baseAmount, setBaseAmount] = useState('');
  const [minParticipation, setMinParticipation] = useState('');
  const [durationValue, setDurationValue] = useState('1');
  const [durationUnit, setDurationUnit] = useState('hours');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateOption(i, value) {
    setOptions((opts) => opts.map((o, idx) => (idx === i ? value : o)));
  }
  function addOption() {
    if (options.length < 6) setOptions((opts) => [...opts, '']);
  }
  function removeOption(i) {
    if (options.length > 2) setOptions((opts) => opts.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return setError('Necesitas al menos 2 opciones.');

    const base = parseAmount(baseAmount);
    if (!base || base < minAmount) return setError(`El bote inicial debe ser de al menos ${formatCurrency(minAmount)}.`);
    if (base > balance) return setError('No tienes saldo suficiente para ese bote inicial.');

    const minPart = parseAmount(minParticipation);
    if (!minPart) return setError('Introduce una apuesta mínima válida.');

    const unitMinutes = { minutes: 1, hours: 60, days: 1440 }[durationUnit];
    const durationMinutes = Math.round(Number(durationValue) * unitMinutes);
    if (!durationValue || durationMinutes < 1) return setError('Introduce una duración válida.');

    setSaving(true);
    const res = await onCreate({
      title: title.trim(),
      options: cleanOptions,
      baseAmount: base,
      minParticipation: minPart,
      durationMinutes,
    });
    setSaving(false);

    if (!res.ok) return setError(res.message);
    setTitle('');
    setOptions(['', '']);
    setBaseAmount('');
    setMinParticipation('');
    setDurationValue('1');
    setDurationUnit('hours');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear apuesta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="¿Quién gana la partida?" autoFocus className={fieldClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Opciones</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Opción ${i + 1}`}
                  className={fieldClass}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="shrink-0 rounded-2xl border border-line px-3 text-sm text-muted">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button type="button" onClick={addOption} className="mt-2 text-xs font-medium text-accent">
              + Añadir opción
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Bote inicial (€)</label>
            <input type="text" inputMode="decimal" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder={String(minAmount)} className={fieldClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Apuesta mínima (€)</label>
            <input type="text" inputMode="decimal" value={minParticipation} onChange={(e) => setMinParticipation(e.target.value)} placeholder="1" className={fieldClass} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Duración</label>
          <div className="flex gap-2">
            <input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} className={fieldClass} />
            <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className={`${fieldClass} w-32`}>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
        </div>

        <p className="rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          Solo la verán tú y tus contactos. Disponible: {formatCurrency(balance)}
        </p>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Crear apuesta'}
        </button>
      </form>
    </Modal>
  );
}

/* ---------------- PÁGINA ---------------- */

const TABS = [
  { id: 'predictions', label: 'Predicciones', icon: Target },
  { id: 'bets', label: 'Apuestas', icon: Dice5 },
];

export default function Bets() {
  const { session, isAdmin } = useAuth();
  const userId = session?.user?.id;
  const now = useNow();

  const [tab, setTab] = useState('predictions');
  const [notice, setNotice] = useState('');

  const preds = usePredictions();
  const betsHook = useBets();

  const [predictionTarget, setPredictionTarget] = useState(null);
  const [betEnterTarget, setBetEnterTarget] = useState(null);
  const [betSettleTarget, setBetSettleTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const closePrediction = useCallback(() => setPredictionTarget(null), []);
  const closeEnterBet = useCallback(() => setBetEnterTarget(null), []);
  const closeSettleBet = useCallback(() => setBetSettleTarget(null), []);

  async function handlePredictionConfirm(id, option, amount) {
    const res = await preds.enterPrediction(id, option, amount);
    if (res.ok) {
      closePrediction();
      setNotice('Apuesta registrada');
    }
    return res;
  }

  async function handleBetEnterConfirm(betId, optionId, amount) {
    const res = await betsHook.enterBet(betId, optionId, amount);
    if (res.ok) {
      closeEnterBet();
      setNotice('Apuesta registrada');
    }
    return res;
  }

  async function handleCreateBet(payload) {
    const res = await betsHook.createBet(payload);
    if (res.ok) setNotice('Apuesta creada');
    return res;
  }

  async function handleSettleBet(betId, optionId) {
    const res = await betsHook.settleBet(betId, optionId);
    if (res.ok) setNotice('Apuesta cerrada y repartida');
    return res;
  }

  const loading = tab === 'predictions' ? preds.loading : betsHook.loading;
  const error = tab === 'predictions' ? preds.error : betsHook.error;

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Apuestas</h1>
        <p className="mt-1 text-sm text-muted">Predicciones para todos, apuestas entre tus contactos</p>
      </header>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
              tab === id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-48 animate-pulse rounded-3xl bg-surface" />
          <div className="h-48 animate-pulse rounded-3xl bg-surface" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-negative">{error}</p>
        </div>
      )}

      {!loading && !error && tab === 'predictions' && (
        <>
          {preds.open.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">
              No hay predicciones abiertas ahora mismo.
            </div>
          ) : (
            <div className="space-y-3">
              {preds.open.map((p) => (
                <PredictionCard
                  key={p.id}
                  prediction={p}
                  totals={preds.totals[p.id]}
                  myEntry={preds.myEntries[p.id]}
                  now={now}
                  onPick={(pred, option) => setPredictionTarget({ prediction: pred, option })}
                />
              ))}
            </div>
          )}

          {preds.settled.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold">Historial</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {preds.settled.map((p) => {
                  const entry = preds.myEntries[p.id];
                  const won = entry && Number(entry.payout) > 0;
                  return (
                    <li key={p.id} className="px-4 py-3.5">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted">
                        Ganó: {p.winning_option === 'yes' ? p.option_yes_label : p.option_no_label}
                        {entry && (won ? ` · Ganaste ${formatCurrency(entry.payout)}` : ' · No acertaste')}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {!loading && !error && tab === 'bets' && (
        <>
          {betsHook.open.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">
              No tienes apuestas abiertas. Crea una o pide a un contacto que te invite.
            </div>
          ) : (
            <div className="space-y-3">
              {betsHook.open.map((b) => (
                <BetCard
                  key={b.id}
                  bet={b}
                  totals={betsHook.totals[b.id]}
                  myEntry={betsHook.myEntries[b.id]}
                  now={now}
                  userId={userId}
                  isAdmin={isAdmin}
                  onEnter={(bet, option) => setBetEnterTarget({ bet, option })}
                  onSettle={(bet) => setBetSettleTarget(bet)}
                />
              ))}
            </div>
          )}

          {betsHook.settled.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold">Cerradas</h2>
              <div className="space-y-3">
                {betsHook.settled.map((b) => (
                  <BetCard
                    key={b.id}
                    bet={b}
                    totals={betsHook.totals[b.id]}
                    myEntry={betsHook.myEntries[b.id]}
                    now={now}
                    userId={userId}
                    isAdmin={isAdmin}
                    onEnter={() => {}}
                    onSettle={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 px-4">
            <div className="mx-auto max-w-2xl">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-semibold text-accent-ink shadow-lg shadow-black/30 transition hover:bg-accent-hover"
              >
                <Plus size={18} />
                Crear apuesta
              </button>
            </div>
          </div>
        </>
      )}

      <EnterPredictionModal target={predictionTarget} onClose={closePrediction} onConfirm={handlePredictionConfirm} balance={betsHook.balance} />
      <EnterBetModal target={betEnterTarget} onClose={closeEnterBet} onConfirm={handleBetEnterConfirm} balance={betsHook.balance} />
      <SettleBetModal bet={betSettleTarget} totals={betSettleTarget ? betsHook.totals[betSettleTarget.id] : null} onClose={closeSettleBet} onSettle={handleSettleBet} />
      <CreateBetModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateBet} minAmount={betsHook.minAmount} balance={betsHook.balance} />
    </div>
  );
}