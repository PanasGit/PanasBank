import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function usePredictions() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [predictions, setPredictions] = useState([]);
  const [totals, setTotals] = useState({});
  const [myEntries, setMyEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    const accRes = await supabase.from('accounts').select('balance').eq('user_id', userId).single();

    const [predRes, totalsRes, entriesRes] = await Promise.all([
      supabase
        .from('predictions')
        .select('id, title, option_yes_label, option_no_label, status, winning_option, closes_at, created_at')
        .order('created_at', { ascending: false }),
      supabase.rpc('all_prediction_totals'),
      supabase.from('prediction_entries').select('prediction_id, option, amount, payout').eq('user_id', userId),
    ]);

    if (predRes.error || totalsRes.error || entriesRes.error) {
      setError('No se pudieron cargar las predicciones.');
      setLoading(false);
      return;
    }

    const totalsMap = {};
    for (const row of totalsRes.data) {
      totalsMap[row.prediction_id] ??= { yes: { total: 0, count: 0 }, no: { total: 0, count: 0 } };
      totalsMap[row.prediction_id][row.option] = { total: Number(row.total), count: row.entry_count };
    }

    setPredictions(predRes.data ?? []);
    setTotals(totalsMap);
    setMyEntries(Object.fromEntries(entriesRes.data.map((e) => [e.prediction_id, e])));
    setError('');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`predictions-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prediction_entries' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const open = useMemo(() => predictions.filter((p) => p.status === 'open'), [predictions]);
  const settled = useMemo(() => predictions.filter((p) => p.status !== 'open'), [predictions]);

  const enterPrediction = async (predictionId, option, amount) => {
    const { error } = await supabase.rpc('enter_prediction', {
      p_prediction_id: predictionId,
      p_option: option,
      p_amount: amount,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return { open, settled, totals, myEntries, loading, error, reload: load, enterPrediction };
}