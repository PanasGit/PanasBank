import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const SETTING_KEYS = [
  'loan_default_amount',
  'loan_default_interest',
  'loan_duration_days',
  'loan_penalty_days',
  'loan_max_active',
];

export default function useLoans() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loans, setLoans] = useState([]);
  const [balance, setBalance] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    // Aplica primero los vencimientos pendientes (cobro o penalización)
    await supabase.rpc('process_my_overdue_loans');

    const [loansRes, accRes, profRes, setRes] = await Promise.all([
      supabase
        .from('loans')
        .select('id, amount, interest_rate, amount_due, due_date, status, created_at, repaid_at')
        .eq('user_id', userId) // el admin ve todos por RLS, así que filtramos a mano
        .order('created_at', { ascending: false }),
      supabase.from('accounts').select('balance').eq('user_id', userId).single(),
      supabase.from('profiles').select('loan_blocked_until').eq('id', userId).single(),
      supabase.from('admin_settings').select('key, value').in('key', SETTING_KEYS),
    ]);

    if (loansRes.error || accRes.error || profRes.error || setRes.error) {
      setError('No se pudieron cargar tus préstamos.');
      setLoading(false);
      return;
    }

    const s = Object.fromEntries(setRes.data.map((r) => [r.key, Number(r.value)]));

    setLoans(loansRes.data ?? []);
    setBalance(Number(accRes.data.balance));
    setBlockedUntil(profRes.data.loan_blocked_until);
    setSettings({
      amount: s.loan_default_amount ?? 0,
      interest: s.loan_default_interest ?? 0,
      durationDays: s.loan_duration_days ?? 0,
      penaltyDays: s.loan_penalty_days ?? 0,
      maxActive: s.loan_max_active ?? 1,
    });
    setError('');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: si un préstamo cambia (p. ej. lo procesa el cron), recargamos
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`loans-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const active = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);
  const history = useMemo(() => loans.filter((l) => l.status !== 'active'), [loans]);

  const requestLoan = async () => {
    const { error } = await supabase.rpc('request_loan');
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const repayLoan = async (loanId) => {
    const { error } = await supabase.rpc('repay_loan', { p_loan_id: loanId });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return {
    active, history, balance, blockedUntil, settings,
    loading, error, reload: load, requestLoan, repayLoan,
  };
}