import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { HOTEL_PURCHASE_PRICE, HOTEL_ROOMS, HOTEL_PRICES } from '../data/hotelConfig';

export const useHotelStore = create((set, get) => ({
  hotels: [],
  isProcessing: false,

  fetchHotels: async () => {
    const { data, error } = await supabase.from('hotels').select('*');
    if (!error) set({ hotels: data || [] });
  },

  getHotelState: (hotelId) => {
    const hotel = get().hotels.find(h => h.id === hotelId);
    if (!hotel) {
      return {
        id: hotelId,
        purchased: false,
        owner_id: null,
        rooms: Array.from({ length: HOTEL_ROOMS }, (_, i) => ({
          room_number: i + 1,
          rented: false,
          renter_id: null,
          renter_name: null,
          expires_at: null
        }))
      };
    }
    const rooms = hotel.rooms || hotel.rooms_json || [];
    return {
      id: hotel.id,
      purchased: hotel.purchased || false,
      owner_id: hotel.owner_id,
      rooms: rooms.length === HOTEL_ROOMS ? rooms : get().getDefaultRooms(rooms)
    };
  },

  getDefaultRooms: (existingRooms = []) => {
    const rooms = Array.from({ length: HOTEL_ROOMS }, (_, i) => ({
      room_number: i + 1,
      rented: false,
      renter_id: null,
      renter_name: null,
      expires_at: null
    }));
    existingRooms.forEach(r => {
      if (r.room_number && r.room_number <= HOTEL_ROOMS) {
        rooms[r.room_number - 1] = r;
      }
    });
    return rooms;
  },

  getOwnerEarnings: (hotelId) => {
    const state = get().getHotelState(hotelId);
    const now = new Date();
    let dailyEarnings = 0;
    state.rooms.forEach(room => {
      if (room.rented && room.expires_at) {
        const diffTime = Math.abs(new Date(room.expires_at) - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (room.rent_price && room.rent_days) {
          dailyEarnings += Math.floor(room.rent_price / room.rent_days);
        }
      }
    });
    return dailyEarnings;
  },

  buyHotel: async (hotelId) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) {
      alert("Ошибка: игрок не найден!");
      return false;
    }

    const hotelState = get().getHotelState(hotelId);
    if (hotelState.purchased) {
      alert("Этот отель уже куплен!");
      return false;
    }

    if (Number(player.money) < HOTEL_PURCHASE_PRICE) {
      alert(`Недостаточно денег! Нужно $${HOTEL_PURCHASE_PRICE.toLocaleString()}`);
      return false;
    }

    set({ isProcessing: true });
    try {
      const rooms = Array.from({ length: HOTEL_ROOMS }, (_, i) => ({
        room_number: i + 1,
        rented: false,
        renter_id: null,
        renter_name: null,
        expires_at: null
      }));

      const { error: dbError } = await supabase
        .from('hotels')
        .upsert({
          id: hotelId,
          owner_id: player.id,
          purchased: true,
          rooms: rooms
        }, { onConflict: 'id' });

      if (dbError) throw dbError;

      await updateProfile({ money: Number(player.money) - HOTEL_PURCHASE_PRICE });
      await get().fetchHotels();
      alert("Поздравляем! Вы стали владельцем отеля!");
      return true;
    } catch (err) {
      console.error("Ошибка покупки отеля:", err);
      alert("Ошибка при покупке отеля!");
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  rentRoom: async (hotelId, days) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) {
      alert("Ошибка: игрок не найден!");
      return false;
    }

    const price = HOTEL_PRICES[days];
    if (!price) {
      alert("Некорректный срок аренды!");
      return false;
    }

    if (Number(player.money) < price) {
      alert(`Недостаточно денег! Нужно $${price.toLocaleString()}`);
      return false;
    }

    const hotelState = get().getHotelState(hotelId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const freeRoom = hotelState.rooms.find(r => !r.rented || (r.expires_at && new Date(r.expires_at) < now));
    if (!freeRoom) {
      alert("Свободных комнат нет!");
      return false;
    }

    set({ isProcessing: true });
    try {
      const updatedRooms = hotelState.rooms.map(r => {
        if (r.room_number === freeRoom.room_number) {
          return {
            ...r,
            rented: true,
            renter_id: player.id,
            renter_name: player.username || `Игрок ${player.id}`,
            expires_at: expiresAt,
            rent_price: price,
            rent_days: days,
            rented_at: now.toISOString()
          };
        }
        return r;
      });

      const { error: dbError } = await supabase
        .from('hotels')
        .upsert({ id: hotelId, rooms: updatedRooms, purchased: hotelState.purchased, owner_id: hotelState.owner_id })
        .eq('id', hotelId);

      if (dbError) throw dbError;

      await updateProfile({ money: Number(player.money) - price });

      if (hotelState.owner_id && hotelState.owner_id !== player.id) {
        const profit = Math.floor(price * 0.7);
        await supabase
          .from('profiles')
          .update({ money: supabase.raw('money + ' + profit) })
          .eq('id', hotelState.owner_id);
      }

      await get().fetchHotels();
      alert(`Комната ${freeRoom.room_number} арендована на ${days} суток!`);
      return true;
    } catch (err) {
      console.error("Ошибка аренды комнаты:", err);
      alert("Ошибка при аренде комнаты!");
      return false;
    } finally {
      set({ isProcessing: false });
    }
  }
}));
