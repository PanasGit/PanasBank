import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Users, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import useBizums from '../hooks/useBizums';
import useContacts from '../hooks/useContacts';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatSigned, formatMovementDate } from '../utils/format';

function parseAmount(raw) {
  const v = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

const fieldClass =
  'w-full rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function Bizum() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { bizums, balance, loading, error, reload, sendBizum } = useBizums();
  const { friends } = useContacts();

  // Modal de envío
  const [sendOpen, setSendOpen] = useState(false);
  const [step, setStep] = useState('pick'); // 'pick' | 'form'
  const [friend, setFriend] = useState(null);
  const [amount, setAmount] = useState('');
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal de detalle
  const [detail, setDetail] = useState(null);

  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const closeSend = useCallback(() => setSendOpen(false), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  // "Volver a enviar": primero a quien enviaste más recientemente
  const recentFriends = useMemo(() => {
    const order = [];
    bizums.forEach((b) => {
      if (b.sender_id === userId && !order.includes(b.receiver_id)) order.push(b.receiver_id);
    });
    const rank = (id) => (order.includes(id) ? order.indexOf(id) : Infinity);
    return [...friends].sort((a, b) => rank(a.id) - rank(b.id)).slice(0, 8);
  }, [friends, bizums, userId]);

  function openSend(preselected = null) {
    setAmount('');
    setConcepto('');
    setDescripcion('');
    setFormError('');
    setFriend(preselected);
    setStep(preselected ? 'form' : 'pick');
    setSendOpen(true);
  }

  async function handleSend(e) {
    e.preventDefault();
    setFormError('');

    const parsed = parseAmount(amount);
    if (!parsed) {
      setFormError('Introduce un importe válido (máximo 2 decimales).');
      return;
    }
    if (parsed > balance) {
      setFormError('No tienes saldo suficiente.');
      return;
    }
    if (!concepto.trim()) {
      setFormError('El concepto es obligatorio.');
      return;
    }

    setSending(true);
    const res = await sendBizum({
      receiverId: friend.id,
      amount: parsed,
      concepto: concepto.trim(),
      descripcion: descripcion.trim(),
    });
    setSending(false);

    if (!res.ok) {
      setFormError(res.message);
      return;
    }
    closeSend();
    setNotice(`Bizum de ${formatCurrency(parsed)} enviado a ${friend.full_name.split(' ')[0]}`);
  }

  const detailSent = detail?.sender_id === userId;

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Bizum</h1>
        <p className="mt-1 text-sm text-muted">
          Saldo disponible:{' '}
          <span className="font-medium text-ink">{formatCurrency(balance)}</span>
        </p>
      </header>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      {/* Volver a enviar */}
      {friends.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-base font-semibold">Volver a enviar</h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {recentFriends.map((f) => (
              <button
                key={f.id}
                onClick={() => openSend(f)}
                className="flex w-16 shrink-0 flex-col items-center gap-2"
              >
                <Avatar name={f.full_name} color={f.avatar_color} size={56} />
                <span className="w-full truncate text-center text-xs text-muted">
                  {f.full_name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Histórico */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Últimos Bizums</h2>

        {loading && <div className="h-56 animate-pulse rounded-3xl bg-surface" />}

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

        {!loading && !error && bizums.length === 0 && (
          <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-muted">
            Aún no has enviado ni recibido ningún Bizum.
          </div>
        )}

        {!loading && !error && bizums.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            {bizums.map((b) => {
              const sent = b.sender_id === userId;
              const other = sent ? b.receiver : b.sender;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => setDetail(b)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2"
                  >
                    <Avatar name={other?.full_name} color={other?.avatar_color} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{other?.full_name ?? 'Usuario'}</p>
                      <p className="truncate text-xs text-muted">
                        {b.concepto} · {formatMovementDate(b.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-sm font-semibold ${sent ? 'text-ink' : 'text-positive'}`}>
                        {formatSigned(sent ? 'expense' : 'income', b.amount)}
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted">
                        <CheckCircle2 size={12} className="text-positive" />
                        {sent ? 'Enviado' : 'Recibido'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Botón de enviar, siempre visible sobre el navbar */}
      <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 px-4">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => openSend()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-semibold text-accent-ink shadow-lg shadow-black/30 transition hover:bg-accent-hover"
          >
            <Send size={18} />
            Enviar Bizum
          </button>
        </div>
      </div>

      {/* Modal: enviar */}
      <Modal
        open={sendOpen}
        onClose={closeSend}
        title={step === 'pick' ? 'Elige un contacto' : 'Enviar Bizum'}
      >
        {step === 'pick' && friends.length === 0 && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Users size={24} />
            </div>
            <p className="text-sm font-medium">Aún no tienes contactos</p>
            <p className="mt-1 text-xs text-muted">
              Agrega a alguien por su teléfono para poder enviarle Bizums.
            </p>
            <Link
              to="/contactos"
              className="mt-5 inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
            >
              Ir a contactos
            </Link>
          </div>
        )}

        {step === 'pick' && friends.length > 0 && (
          <ul className="-mx-2 max-h-80 overflow-y-auto">
            {friends.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => {
                    setFriend(f);
                    setStep('form');
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <Avatar name={f.full_name} color={f.avatar_color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.full_name}</p>
                    <p className="text-xs text-muted">{f.phone}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {step === 'form' && friend && (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <Avatar name={friend.full_name} color={friend.avatar_color} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{friend.full_name}</p>
                <p className="text-xs text-muted">{friend.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="text-xs font-medium text-accent"
              >
                Cambiar
              </button>
            </div>

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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Concepto</label>
              <input
                type="text"
                maxLength={40}
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Cena, entradas, deuda..."
                className={fieldClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Descripción <span className="font-normal">(opcional)</span>
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Añade un mensaje..."
                className={`${fieldClass} resize-none`}
              />
            </div>

            {formError && <p className="text-sm text-negative">{formError}</p>}

            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : 'Enviar'}
            </button>
          </form>
        )}
      </Modal>

      {/* Modal: detalle */}
      <Modal open={!!detail} onClose={closeDetail} title="Detalle del Bizum">
        {detail && (
          <div>
            <div className="mb-2 text-center">
              <p
                className={`font-display text-4xl font-semibold tracking-tight ${
                  detailSent ? '' : 'text-positive'
                }`}
              >
                {formatSigned(detailSent ? 'expense' : 'income', detail.amount)}
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted">
                <CheckCircle2 size={13} className="text-positive" />
                {detailSent ? 'Enviado' : 'Recibido'}
              </p>
            </div>
            <div className="divide-y divide-line">
              <DetailRow label="De" value={detailSent ? 'Tú' : detail.sender?.full_name ?? 'Usuario'} />
              <DetailRow label="Para" value={detailSent ? detail.receiver?.full_name ?? 'Usuario' : 'Tú'} />
              <DetailRow label="Concepto" value={detail.concepto} />
              <DetailRow label="Descripción" value={detail.descripcion || '—'} />
              <DetailRow
                label="Fecha"
                value={new Date(detail.created_at).toLocaleString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}