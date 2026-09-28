import { useCallback, useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function useContacts() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id, status, created_at, requester_id, addressee_id,
        requester:profiles!requester_id (id, full_name, phone, avatar_color),
        addressee:profiles!addressee_id (id, full_name, phone, avatar_color)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setError('No se pudieron cargar tus contactos.');
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const other = (r) => (r.requester_id === userId ? r.addressee : r.requester);

    setFriends(
      rows
        .filter((r) => r.status === 'accepted')
        .map((r) => ({ contactId: r.id, ...other(r) }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
    );
    setIncoming(
      rows
        .filter((r) => r.status === 'pending' && r.addressee_id === userId)
        .map((r) => ({ contactId: r.id, ...r.requester }))
    );
    setOutgoing(
      rows
        .filter((r) => r.status === 'pending' && r.requester_id === userId)
        .map((r) => ({ contactId: r.id, ...r.addressee }))
    );
    setError('');
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: si cambia algo en contacts, recargamos (RLS filtra lo que no es nuestro)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`contacts-page-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const sendRequest = async (phone) => {
    const { error } = await supabase.rpc('send_friend_request', { p_phone: phone });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  const respond = async (contactId, accept) => {
    const { error } = await supabase.rpc('respond_friend_request', {
      p_contact_id: contactId,
      p_accept: accept,
    });
    if (error) return { ok: false, message: error.message };
    await load();
    return { ok: true };
  };

  // Sirve para eliminar un contacto y para cancelar una solicitud enviada
  const removeContact = async (contactId) => {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error) return { ok: false, message: 'No se pudo completar la acción.' };
    await load();
    return { ok: true };
  };

  return { friends, incoming, outgoing, loading, error, reload: load, sendRequest, respond, removeContact };
}