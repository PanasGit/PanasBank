import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';

export default function useAdminPredictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('id, title, option_yes_label, option_no_label, status, winning_option, closes_at, created_at, prediction_entries (option, amount)')
      .order('created_at', { ascending: false });

    if (error) {
      setError('No se pudieron cargar las predicciones.');
      setLoading(false);
      return;
    }
    setPredictions(data ?? []);
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-predictions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prediction_entries' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const create = async ({ title, optionYes, optionNo, closesAt }) => {
    const { error } = await supabase.rpc('create_prediction', {
      p_title: title,
      p_option_yes: optionYes || 'Sí',
      p_option_no: optionNo || 'No',
      p_closes_at: closesAt || null,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const settle = async (predictionId, winningOption) => {
    const { error } = await supabase.rpc('settle_prediction', {
      p_prediction_id: predictionId,
      p_winning_option: winningOption,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return { predictions, loading, error, reload: load, create, settle };
}