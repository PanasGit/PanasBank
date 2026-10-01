import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';

const KEYS = [
  'loan_default_amount', 'loan_default_interest', 'loan_duration_days',
  'loan_penalty_days', 'loan_max_active', 'bet_min_amount',
  'income_amount', 'income_interval_days',
];

export default function useAdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('admin_settings').select('key, value').in('key', KEYS);
    if (error) {
      setError('No se pudieron cargar los ajustes.');
      setLoading(false);
      return;
    }
    setSettings(Object.fromEntries(data.map((r) => [r.key, Number(r.value)])));
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (key, value) => {
    const { error } = await supabase.from('admin_settings').update({ value }).eq('key', key);
    if (error) return { ok: false, message: 'No se pudo guardar el ajuste.' };
    await load();
    return { ok: true };
  };

  return { settings, loading, error, reload: load, update };
}