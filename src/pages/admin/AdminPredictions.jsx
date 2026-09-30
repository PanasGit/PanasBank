import { useEffect, useState } from 'react';
import { Plus, Loader2, Target, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import useAdminPredictions from '../../hooks/useAdminPredictions';
import { formatCurrency, formatDateTime } from '../../utils/format';

const fieldClass =
  'w-full rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent';

function totals(prediction) {
  const entries = prediction.prediction_entries ?? [];
  const yes = entries.filter((e) => e.option === 'yes').reduce((s, e) => s + Number(e.amount), 0);
  const no = entries.filter((e) => e.option === 'no').reduce((s, e) => s + Number(e.amount), 0);
  return { yes, no, total: yes + no, count: entries.length };
}

function CreateModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [optionYes, setOptionYes] = useState('Sí');
  const [optionNo, setOptionNo] = useState('No');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('El título es obligatorio.');

    setSaving(true);
    const res = await onCreate({
      title: title.trim(),
      optionYes: optionYes.trim(),
      optionNo: optionNo.trim(),
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
    });
    setSaving(false);

    if (!res.ok) return setError(res.message);
    setTitle('');
    setOptionYes('Sí');
    setOptionNo('No');
    setClosesAt('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva predicción">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Ganamos el próximo game?" maxLength={80} autoFocus className={fieldClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Opción afirmativa</label>
            <input value={optionYes} onChange={(e) => setOptionYes(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Opción negativa</label>
            <input value={optionNo} onChange={(e) => setOptionNo(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Cierra automáticamente (opcional)</label>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={fieldClass} />
          <p className="mt-1.5 text-xs text-muted">Déjalo vacío si prefieres cerrarla tú manualmente.</p>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Crear predicción'}
        </button>
      </form>
    </Modal>
  );
}

function SettleModal({ prediction, onClose, onSettle }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  if (!prediction) return null;

  const t = totals(prediction);

  async function handleSettle(option) {
    setError('');
    setSaving(option);
    const res = await onSettle(prediction.id, option);
    setSaving(null);
    if (!res.ok) return setError(res.message);
    onClose();
  }

  return (
    <Modal open={!!prediction} onClose={onClose} title="Cerrar predicción">
      <div className="space-y-3">
        <p className="text-sm font-medium">{prediction.title}</p>
        <p className="text-xs text-muted">Bote total: {formatCurrency(t.total)} · {t.count} participantes</p>

        <div className="space-y-2 pt-2">
          <button disabled={saving !== null} onClick={() => handleSettle('yes')} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-left transition hover:border-accent disabled:opacity-60">
            <span className="text-sm font-medium">{prediction.option_yes_label}</span>
            <span className="flex items-center gap-2 text-sm text-muted">
              {formatCurrency(t.yes)}
              {saving === 'yes' && <Loader2 size={16} className="animate-spin" />}
            </span>
          </button>
          <button disabled={saving !== null} onClick={() => handleSettle('no')} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-left transition hover:border-accent disabled:opacity-60">
            <span className="text-sm font-medium">{prediction.option_no_label}</span>
            <span className="flex items-center gap-2 text-sm text-muted">
              {formatCurrency(t.no)}
              {saving === 'no' && <Loader2 size={16} className="animate-spin" />}
            </span>
          </button>
        </div>

        {t.total > 0 && (t.yes === 0 || t.no === 0) && (
          <p className="text-xs text-muted">Si eliges la opción sin apuestas, nadie gana y el bote pasa a la cuenta de Banca.</p>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

export default function AdminPredictions() {
  const { predictions, loading, error, reload, create, settle } = useAdminPredictions();
  const [createOpen, setCreateOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const open = predictions.filter((p) => p.status === 'open');
  const settled = predictions.filter((p) => p.status !== 'open');

  async function handleCreate(payload) {
    const res = await create(payload);
    if (res.ok) setNotice('Predicción creada');
    return res;
  }

  async function handleSettle(id, option) {
    const res = await settle(id, option);
    if (res.ok) setNotice('Predicción cerrada y repartida');
    return res;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Predicciones</h1>
          <p className="mt-1 text-sm text-muted">Visibles para todos los usuarios de la app</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover">
          <Plus size={18} />
          Nueva
        </button>
      </header>

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
        <>
          <section>
            <h2 className="mb-3 font-display text-base font-semibold">Abiertas</h2>
            {open.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">No hay predicciones abiertas.</div>
            ) : (
              <ul className="space-y-3">
                {open.map((p) => {
                  const t = totals(p);
                  return (
                    <li key={p.id} className="rounded-3xl border border-line bg-surface p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <Target size={15} className="text-accent" />
                            {p.title}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t.count} participantes · Bote {formatCurrency(t.total)}
                            {p.closes_at && ` · Cierra ${formatDateTime(p.closes_at)}`}
                          </p>
                        </div>
                        <button onClick={() => setSettleTarget(p)} className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover">
                          Cerrar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-base font-semibold">Cerradas</h2>
            {settled.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">Aún no se ha cerrado ninguna.</div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {settled.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted">Ganó: {p.winning_option === 'yes' ? p.option_yes_label : p.option_no_label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <SettleModal prediction={settleTarget} onClose={() => setSettleTarget(null)} onSettle={handleSettle} />
    </div>
  );
}