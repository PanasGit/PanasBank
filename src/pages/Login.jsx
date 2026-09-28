import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authLoading && session) return <Navigate to="/" replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError('Credenciales incorrectas. Revisa tu email y contraseña.');
      return;
    }

    navigate('/');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app px-4">
      {/* Resplandor ambiental */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-ink">
            P
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">PanasBank</h1>
          <p className="mt-1 text-sm text-muted">Accede a tu cuenta</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4 rounded-3xl border border-line bg-surface p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Email</label>
            <div className="flex items-center rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-accent">
              <Mail size={18} className="mr-2.5 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Contraseña</label>
            <div className="flex items-center rounded-2xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-accent">
              <Lock size={18} className="mr-2.5 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? (
                  <EyeOff size={18} className="text-muted" />
                ) : (
                  <Eye size={18} className="text-muted" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          ¿No tienes cuenta? Contacta con tu administrador de PanasBank.
        </p>
      </div>
    </div>
  );
}