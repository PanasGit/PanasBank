import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function useBets() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [bets, setBets] = useState([]);
  const [totals, setTotals] = useState({});
  const [myEntries, setMyEntries] = useState({});
  const [minAmount, setMinAmount] = useState(1);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    const [betsRes, totalsRes, entriesRes, settingRes, accRes] = await Promise.all([
      supabase
        .from('bets')
        .select(`
          id, title, base_amount, min_amount, status, winning_option_id, ends_at, created_at, created_by,
          creator:profiles!created_by (id, full_name, avatar_color),
          bet_options (id, label)
        `)
        .order('created_at', { ascending: false }),
      supabase.rpc('my_visible_bet_totals'),
      supabase.from('bet_entries').select('bet_id, option_id, amount, payout').eq('user_id', userId),
      supabase.from('admin_settings').select('value').eq('key', 'bet_min_amount').single(),
      supabase.from('accounts').select('balance').eq('user_id', userId).single(),
    ]);

    if (betsRes.error || totalsRes.error || entriesRes.error) {
      setError('No se pudieron cargar las apuestas.');
      setLoading(false);
      return;
    }

    const totalsMap = {};
    for (const row of totalsRes.data) {
      totalsMap[row.bet_id] ??= {};
      totalsMap[row.bet_id][row.option_id] = { total: Number(row.total), count: row.entry_count };
    }

    setBets(betsRes.data ?? []);
    setTotals(totalsMap);
    setMyEntries(Object.fromEntries(entriesRes.data.map((e) => [e.bet_id, e])));
    if (!settingRes.error) setMinAmount(Number(settingRes.data.value));
    if (!accRes.error) setBalance(Number(accRes.data.balance));
    setError('');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`bets-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bet_entries' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const open = useMemo(() => bets.filter((b) => b.status === 'open'), [bets]);
  const settled = useMemo(() => bets.filter((b) => b.status !== 'open'), [bets]);

  const createBet = async ({ title, options, baseAmount, minParticipation, durationMinutes }) => {
    const { error } = await supabase.rpc('create_bet', {
      p_title: title,
      p_options: options,
      p_base_amount: baseAmount,
      p_min_amount: minParticipation,
      p_duration_minutes: durationMinutes,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const enterBet = async (betId, optionId, amount) => {
    const { error } = await supabase.rpc('enter_bet', {
      p_bet_id: betId,
      p_option_id: optionId,
      p_amount: amount,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const settleBet = async (betId, optionId) => {
    const { error } = await supabase.rpc('settle_bet', {
      p_bet_id: betId,
      p_winning_option_id: optionId,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  return {
    open, settled, totals, myEntries, minAmount, balance,
    loading, error, reload: load, createBet, enterBet, settleBet,
  };
}