import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';

export const useSmsStore = create((set, get) => ({
  messages: [],
  realtimeChannel: null,

  fetchMessages: async () => {
    const { player } = usePlayerStore.getState();
    if (!player) return;

    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('to_phone', player.phone_number)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ messages: data });
    }
  },

  sendSms: async (toPhone, message) => {
    const { player } = usePlayerStore.getState();
    if (!player || !toPhone || !message.trim()) return false;

    const { error } = await supabase
      .from('sms_messages')
      .insert({
        from_phone: player.phone_number,
        to_phone: toPhone,
        message: message.trim(),
      });

    if (error) {
      console.error('SMS error:', error);
      return false;
    }

    // Refresh inbox
    get().fetchMessages();
    return true;
  },

  markAsRead: async (id) => {
    const { error } = await supabase
      .from('sms_messages')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      set({ messages: get().messages.map(m => m.id === id ? { ...m, read: true } : m) });
    }
  },

  startRealtimeSubscription: () => {
    const { player } = usePlayerStore.getState();
    if (!player || get().realtimeChannel) return;

    const channel = supabase
      .channel('sms-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
          filter: `to_phone=eq.${player.phone_number}`,
        },
        (payload) => {
          set({ messages: [payload.new, ...get().messages] });
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  stopRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  getUnreadCount: () => {
    return get().messages.filter(m => !m.read).length;
  }
}));