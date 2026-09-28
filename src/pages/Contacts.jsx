import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, X, Phone, Loader2, UserMinus, Clock, Users } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import useContacts from '../hooks/useContacts';

function PersonRow({ person, children }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <Avatar name={person.full_name} color={person.avatar_color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.full_name}</p>
        <p className="text-xs text-muted">{person.phone}</p>
      </div>
      {children}
    </li>
  );
}

function Section({ title, count, icon: Icon, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-muted" />
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

const listClass = 'divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface';

export default function Contacts() {
  const { friends, incoming, outgoing, loading, error, reload, sendRequest, respond, removeContact } =
    useContacts();

  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  function openModal() {
    setPhone('');
    setFormError('');
    setModalOpen(true);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError('');

    const clean = phone.replace(/[\s.\-]/g, '');
    if (clean.length < 6) {
      setFormError('Introduce un teléfono válido.');
      return;
    }

    setSending(true);
    const res = await sendRequest(clean);
    setSending(false);

    if (!res.ok) {
      setFormError(res.message);
      return;
    }
    closeModal();
    setNotice('Solicitud enviada');
  }

  async function runAction(id, fn, successMsg) {
    setBusyId(id);
    const res = await fn();
    setBusyId(null);
    setNotice(res.ok ? successMsg : res.message);
  }

  function handleRemove(person) {
    if (!window.confirm(`¿Eliminar a ${person.full_name} de tus contactos?`)) return;
    runAction(person.contactId, () => removeContact(person.contactId), 'Contacto eliminado');
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Volver"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface transition hover:bg-surface-2"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Contactos</h1>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover"
        >
          <UserPlus size={18} />
          Agregar
        </button>
      </header>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-3xl bg-surface" />
          <div className="h-48 rounded-3xl bg-surface" />
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

      {!loading && !error && (
        <>
          {incoming.length > 0 && (
            <Section title="Solicitudes pendientes" count={incoming.length} icon={Clock}>
              <ul className={listClass}>
                {incoming.map((p) => (
                  <PersonRow key={p.contactId} person={p}>
                    {busyId === p.contactId ? (
                      <Loader2 size={18} className="animate-spin text-muted" />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          aria-label="Rechazar"
                          onClick={() => runAction(p.contactId, () => respond(p.contactId, false), 'Solicitud rechazada')}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-negative"
                        >
                          <X size={18} />
                        </button>
                        <button
                          aria-label="Aceptar"
                          onClick={() => runAction(p.contactId, () => respond(p.contactId, true), 'Contacto agregado')}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink transition hover:bg-accent-hover"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    )}
                  </PersonRow>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Mis contactos" count={0} icon={Users}>
            {friends.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-8 text-center">
                <p className="text-sm text-muted">Aún no tienes contactos.</p>
                <p className="mt-1 text-xs text-muted">
                  Agrégalos por su teléfono para poder enviar Bizums y ver sus apuestas.
                </p>
              </div>
            ) : (
              <ul className={listClass}>
                {friends.map((p) => (
                  <PersonRow key={p.contactId} person={p}>
                    {busyId === p.contactId ? (
                      <Loader2 size={18} className="animate-spin text-muted" />
                    ) : (
                      <button
                        aria-label="Eliminar contacto"
                        onClick={() => handleRemove(p)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-negative"
                      >
                        <UserMinus size={18} />
                      </button>
                    )}
                  </PersonRow>
                ))}
              </ul>
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Solicitudes enviadas" count={0} icon={Clock}>
              <ul className={listClass}>
                {outgoing.map((p) => (
                  <PersonRow key={p.contactId} person={p}>
                    {busyId === p.contactId ? (
                      <Loader2 size={18} className="animate-spin text-muted" />
                    ) : (
                      <button
                        onClick={() =>
                          runAction(p.contactId, () => removeContact(p.contactId), 'Solicitud cancelada')
                        }
                        className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ink"
                      >
                        Cancelar
                      </button>
                    )}
                  </PersonRow>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={closeModal} title="Agregar contacto">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Número de teléfono</label>
            <div className="flex items-center rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-accent">
              <Phone size={18} className="mr-2.5 text-muted" />
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="600 000 000"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-negative">{formError}</p>}

          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : 'Enviar solicitud'}
          </button>
        </form>
      </Modal>
    </div>
  );
}