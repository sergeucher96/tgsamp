import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore } from './usePlayerStore';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SmsMessage {
  id: string;
  from_phone: string;
  to_phone: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface SmsState {
  messages: SmsMessage[];
  realtimeChannel: RealtimeChannel | null;

  fetchMessages: () => Promise<void>;
  sendSms: (toPhone: string, message: string) => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  startRealtimeSubscription: () => void;
  stopRealtimeSubscription: () => void;
  getUnreadCount: () => number;
}

export const useSmsStore = create<SmsState>((set, get) => ({
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

  sendSms: async (toPhone: string, message: string) => {
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

    get().fetchMessages();
    return true;
  },

  markAsRead: async (id: string) => {
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
          set({ messages: [payload.new as SmsMessage, ...get().messages] });
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