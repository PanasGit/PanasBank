import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function useHomeData(limit = 10) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [account, setAccount] = useState(null);
  const [movements, setMovements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    // Cuenta y solicitudes de amistad pendientes, en paralelo.
    // OJO: filtramos por user_id a mano porque la política RLS deja al admin ver TODAS las cuentas.
    const [accountRes, pendingRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, account_number, balance')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .eq('status', 'pending'),
    ]);

    if (accountRes.error) {
      setError('No se pudo cargar tu cuenta.');
      setLoading(false);
      return;
    }

    const movementsRes = await supabase
      .from('movements')
      .select('id, type, category, amount, description, created_at')
      .eq('account_id', accountRes.data.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (movementsRes.error) {
      setError('No se pudieron cargar los movimientos.');
      setLoading(false);
      return;
    }

    setError('');
    setAccount(accountRes.data);
    setMovements(movementsRes.data);
    setPendingRequests(pendingRes.count ?? 0);
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    load();
  }, [load]);

    // El badge de solicitudes se actualiza solo cuando alguien te agrega
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`home-contacts-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return { account, movements, pendingRequests, loading, error, reload: load };
}