import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [profRes, accRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, role, created_at').order('created_at'),
      supabase.from('accounts').select('user_id, balance, account_number'),
    ]);

    if (profRes.error || accRes.error) {
      setError('No se pudieron cargar los usuarios.');
      setLoading(false);
      return;
    }

    const accByUser = Object.fromEntries(accRes.data.map((a) => [a.user_id, a]));
    setUsers(profRes.data.map((p) => ({ ...p, account: accByUser[p.id] ?? null })));
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const setRole = async (userId, role) => {
    const { error } = await supabase.rpc('admin_set_role', { p_user: userId, p_role: role });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const creditIncome = async (userId, amount, description) => {
    const { error } = await supabase.rpc('admin_credit_income', {
      p_user: userId,
      p_amount: amount,
      p_description: description,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const adjustBalance = async (userId, amount, description) => {
    const { error } = await supabase.rpc('admin_adjust_balance', {
      p_user: userId,
      p_amount: amount,
      p_description: description,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return { users, loading, error, reload: load, setRole, creditIncome, adjustBalance };
}