import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function useBizums() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [bizums, setBizums] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    const [bizRes, accRes] = await Promise.all([
      supabase
        .from('bizums')
        .select(`
          id, amount, concepto, descripcion, status, created_at, sender_id, receiver_id,
          sender:profiles!sender_id (id, full_name, phone, avatar_color),
          receiver:profiles!receiver_id (id, full_name, phone, avatar_color)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('accounts').select('balance').eq('user_id', userId).single(),
    ]);

    if (bizRes.error || accRes.error) {
      setError('No se pudieron cargar tus Bizums.');
      setLoading(false);
      return;
    }

    setBizums(bizRes.data ?? []);
    setBalance(Number(accRes.data.balance));
    setError('');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: RLS solo nos entrega los bizums donde participamos
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`bizums-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bizums' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const sendBizum = async ({ receiverId, amount, concepto, descripcion }) => {
    const { error } = await supabase.rpc('send_bizum', {
      p_receiver: receiverId,
      p_amount: amount,
      p_concepto: concepto,
      p_descripcion: descripcion || null,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return { bizums, balance, loading, error, reload: load, sendBizum };
}