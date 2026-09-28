import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sun, Moon, KeyRound, Landmark, ArrowLeftRight, Users, ShieldCheck,
  LogOut, ChevronRight, Eye, EyeOff, Lock, Mail, Phone, Loader2,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const listClass = 'divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface';
const rowClass =
  'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/50';

const THEMES = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
];

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}

function RowInner({ icon: Icon, label, hint }) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <ChevronRight size={18} className="text-muted" />
    </>
  );
}

function PasswordField({ label, value, onChange, autoComplete, show, onToggle, autoFocus }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted">{label}</label>
      <div className="flex items-center rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-accent">
        <Lock size={18} className="mr-2.5 text-muted" />
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff size={18} className="text-muted" /> : <Eye size={18} className="text-muted" />}
        </button>
      </div>
    </div>
  );
}

function passwordErrorMessage(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('different from the old')) return 'La nueva contraseña debe ser distinta a la actual.';
  if (m.includes('weak') || m.includes('at least'))
    return 'La contraseña es demasiado débil. Prueba con una más larga o más compleja.';
  return 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
}

// Es un componente aparte para que sus campos se reinicien cada vez que se abre el modal
function PasswordForm({ email, onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (next.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    if (next === current) return setError('La nueva contraseña debe ser distinta a la actual.');

    setSaving(true);

    // 1. Verificamos la contraseña actual
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (authError) {
      setSaving(false);
      return setError('La contraseña actual no es correcta.');
    }

    // 2. Actualizamos
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (updateError) return setError(passwordErrorMessage(updateError.message));

    onDone();
  }

  const toggle = () => setShow((s) => !s);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        label="Contraseña actual"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        show={show}
        onToggle={toggle}
        autoFocus
      />
      <PasswordField
        label="Nueva contraseña"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        show={show}
        onToggle={toggle}
      />
      <PasswordField
        label="Repite la nueva contraseña"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        show={show}
        onToggle={toggle}
      />

      {error && <p className="text-sm text-negative">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function Settings() {
  const { session, profile, isAdmin, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [pwdOpen, setPwdOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const closePwd = useCallback(() => setPwdOpen(false), []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Ajustes</h1>
      </header>

      {notice && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">{notice}</p>}

      {/* Perfil */}
      <section className="rounded-3xl border border-line bg-surface p-5">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.full_name} color={profile?.avatar_color} size={64} />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{profile?.full_name}</p>
            {isAdmin && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                <ShieldCheck size={12} />
                Administrador
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2.5 text-sm text-muted">
          <p className="flex items-center gap-2.5">
            <Mail size={16} />
            <span className="truncate">{session?.user?.email}</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Phone size={16} />
            {profile?.phone}
          </p>
        </div>
      </section>

      {/* Apariencia */}
      <Section title="Apariencia">
        <div className="rounded-3xl border border-line bg-surface p-3">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  theme === id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad">
        <div className={listClass}>
          <button onClick={() => setPwdOpen(true)} className={rowClass}>
            <RowInner icon={KeyRound} label="Cambiar contraseña" hint="Actualiza la clave de acceso a tu cuenta" />
          </button>
        </div>
      </Section>

      {/* Accesos rápidos */}
      <Section title="Accesos rápidos">
        <div className={listClass}>
          <Link to="/prestamos" className={rowClass}>
            <RowInner icon={Landmark} label="Solicitar un préstamo" hint="Consulta las condiciones y pide uno" />
          </Link>
          <Link to="/bizum" className={rowClass}>
            <RowInner icon={ArrowLeftRight} label="Enviar un Bizum" hint="Envía dinero a tus contactos" />
          </Link>
          <Link to="/contactos" className={rowClass}>
            <RowInner icon={Users} label="Contactos" hint="Tus amigos y solicitudes pendientes" />
          </Link>
        </div>
      </Section>

      {/* Administración (solo admin) */}
      {isAdmin && (
        <Section title="Administración">
          <div className={listClass}>
            <Link to="/admin" className={rowClass}>
              <RowInner icon={ShieldCheck} label="Panel de administración" hint="Usuarios, préstamos y predicciones" />
            </Link>
          </div>
        </Section>
      )}

      {/* Cerrar sesión */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-sm font-semibold text-negative transition hover:bg-surface-2 disabled:opacity-60"
      >
        {signingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
        Cerrar sesión
      </button>

      <p className="pb-2 text-center text-xs text-muted">PanasBank</p>

      <Modal open={pwdOpen} onClose={closePwd} title="Cambiar contraseña">
        <PasswordForm
          email={session?.user?.email}
          onDone={() => {
            setPwdOpen(false);
            setNotice('Contraseña actualizada correctamente');
          }}
        />
      </Modal>
    </div>
  );
}