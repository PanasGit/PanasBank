import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
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

  // Si ya hay sesión activa, no mostramos el login
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-dark-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-2xl font-bold">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PanasBank</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Accede a tu cuenta</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl bg-white dark:bg-dark-card p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 focus-within:border-primary">
              <Phone size={18} className="mr-2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full bg-transparent text-sm outline-none dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Contraseña
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 focus-within:border-primary">
              <Lock size={18} className="mr-2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none dark:text-white"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? (
                  <EyeOff size={18} className="text-slate-400" />
                ) : (
                  <Eye size={18} className="text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿No tienes cuenta? Contacta con tu administrador de PanasBank.
        </p>
      </div>
    </div>
  );
}