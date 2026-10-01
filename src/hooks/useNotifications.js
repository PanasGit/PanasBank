import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const LIMIT = 15;

export default function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCount = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (!error) setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // El badge se actualiza solo en cuanto llega cualquier notificación nueva
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-badge-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadCount]);

  // Se llama al abrir el modal: carga las últimas 15 y luego marca como leídas TODAS las pendientes
  const open = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');

    const { data, error: listError } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, related_id, created_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (listError) {
      setError('No se pudieron cargar las notificaciones.');
      setLoading(false);
      return;
    }

    setNotifications(data ?? []);
    setLoading(false);

    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    await loadCount();
  }, [userId, loadCount]);

  return { notifications, unreadCount, loading, error, open };
}