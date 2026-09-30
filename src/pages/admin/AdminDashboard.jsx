import { useEffect, useState } from 'react';
import { Users, Wallet, Landmark, Target, Building2 } from 'lucide-react';
import supabase from '../../supabaseClient';
import { formatCurrency } from '../../utils/format';

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profiles, accounts, loans, predictions, bets] = await Promise.all([
        supabase.from('profiles').select('id, role'),
        supabase.from('accounts').select('balance, user_id, profiles!inner(role)'),
        supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('bets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      const users = (profiles.data ?? []).filter((p) => p.role !== 'house');
      const houseAccount = (accounts.data ?? []).find((a) => a.profiles?.role === 'house');
      const circulating = (accounts.data ?? [])
        .filter((a) => a.profiles?.role !== 'house')
        .reduce((sum, a) => sum + Number(a.balance), 0);

      setStats({
        totalUsers: users.length,
        circulating,
        houseBalance: Number(houseAccount?.balance ?? 0),
        activeLoans: loans.count ?? 0,
        openPredictions: predictions.count ?? 0,
        openBets: bets.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="mt-1 text-sm text-muted">Estado general de PanasBank</p>
      </header>

      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={Users} label="Usuarios" value={stats.totalUsers} />
          <StatCard icon={Wallet} label="Dinero en circulación" value={formatCurrency(stats.circulating)} />
          <StatCard icon={Building2} label="Saldo de Banca" value={formatCurrency(stats.houseBalance)} />
          <StatCard icon={Landmark} label="Préstamos activos" value={stats.activeLoans} />
          <StatCard icon={Target} label="Predicciones abiertas" value={stats.openPredictions} />
          <StatCard icon={Target} label="Apuestas abiertas" value={stats.openBets} />
        </div>
      )}
    </div>
  );
}