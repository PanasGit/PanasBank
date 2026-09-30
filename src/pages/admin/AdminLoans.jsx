import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import useAdminSettings from '../../hooks/useAdminSettings';

const FIELDS = [
  { key: 'loan_default_amount', label: 'Cantidad del préstamo (€)', step: '0.01' },
  { key: 'loan_default_interest', label: 'Interés (%)', step: '0.01' },
  { key: 'loan_duration_days', label: 'Plazo de devolución (días)', step: '1' },
  { key: 'loan_penalty_days', label: 'Días de bloqueo por impago', step: '1' },
  { key: 'loan_max_active', label: 'Préstamos activos máximos por usuario', step: '1' },
  { key: 'bet_min_amount', label: 'Bote mínimo para crear una apuesta (€)', step: '0.01' },
];

export default function AdminLoans() {
  const { settings, loading, error, reload, update } = useAdminSettings();
  const [values, setValues] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    if (settings) setValues(settings);
  }, [settings]);

  async function handleSave(key) {
    const n = Number(values[key]);
    if (Number.isNaN(n) || n < 0) return;
    setSavingKey(key);
    const res = await update(key, n);
    setSavingKey(null);
    if (res.ok) {
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Préstamos y apuestas</h1>
        <p className="mt-1 text-sm text-muted">Parámetros globales de la app</p>
      </header>

      {loading && <div className="h-96 animate-pulse rounded-3xl bg-surface" />}

      {!loading && error && (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-negative">{error}</p>
          <button onClick={reload} className="mt-4 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && settings && (
        <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {FIELDS.map(({ key, label, step }) => {
            const changed = Number(values[key]) !== settings[key];
            return (
              <div key={key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <label className="min-w-0 flex-1 text-sm font-medium">{label}</label>
                <input
                  type="number"
                  step={step}
                  min="0"
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className="w-28 rounded-xl border border-line bg-surface-2 px-3 py-2 text-right text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={() => handleSave(key)}
                  disabled={!changed || savingKey === key}
                  className="flex h-9 w-20 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
                >
                  {savingKey === key ? <Loader2 size={16} className="animate-spin" /> : savedKey === key ? <Check size={16} /> : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}