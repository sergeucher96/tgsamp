import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import { usePlayerStore, type Profile } from './usePlayerStore';
import { BUSINESS_TYPES, RESOURCE_TYPES } from '../features/businesses/data/businessConfig';

type ResourceType = keyof typeof RESOURCE_TYPES;

export interface BusinessState {
  id: string | number;
  purchased: boolean;
  owner_id: string | null;
  daily_earnings: number;
  purchased_at: string | null;
  business_balance: number;
}

export interface BusinessResource {
  resource_type: string;
  quantity: number;
}

export interface BusinessReport {
  resource_type?: string;
  consumed_hour: number;
  consumed_day: number;
  consumed_week: number;
}

export interface BusinessOrder {
  id: string | number;
  business_id: string;
  resource_type: string;
  quantity: number;
  price_per_unit: number;
  total_cost: number;
  status: string;
  created_at: string;
}

export interface BusinessSale {
  id: string | number;
  business_id: string;
  product_id: string;
  product_name: string;
  buyer_name?: string;
  player_id: string;
  sale_price: number;
  resource_changes?: Record<string, number>;
  sale_amount?: number;
  resources_consumed?: string | Record<string, number>;
  created_at: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  icon: string;
  price: number;
  resources: Record<string, number>;
}

export interface BusinessStoreState {
  businesses: BusinessState[];
  isProcessing: boolean;
  resources: Record<string, Record<string, number>>;
  reports: Record<string, Record<string, BusinessReport>>;
  orders: Record<string, BusinessOrder[]>;
  salesHistory: Record<string, BusinessSale[]>;

  fetchBusinesses: () => Promise<void>;
  getBusinessState: (businessId: string) => BusinessState;
  buyBusiness: (businessId: string) => Promise<boolean>;
  isPlayerOwner: (businessId: string) => boolean;
  getDailyEarnings: (businessId: string) => number;
  getLocationType: (businessId: string) => string;
  initBusinessResources: (businessId: string) => Promise<void>;
  fetchResources: (businessId: string) => Promise<void>;
  fetchReports: (businessId: string) => Promise<void>;
  fetchOrders: (businessId: string) => Promise<void>;
  fetchSalesHistory: (businessId: string) => Promise<void>;
  getSalesHistory: (businessId: string) => BusinessSale[];
  loadBusinessData: (businessId: string) => Promise<void>;
  placeOrder: (businessId: string, resourceType: string, quantity: number, pricePerUnit: number) => Promise<boolean>;
  depositToBusiness: (businessId: string, amount: number) => Promise<boolean>;
  withdrawFromBusiness: (businessId: string, amount: number) => Promise<boolean>;
  getResources: (businessId: string) => Record<string, number>;
  getReports: (businessId: string) => Record<string, BusinessReport>;
  getOrders: (businessId: string) => BusinessOrder[];
  getShopProducts: (shopId: string) => Promise<ShopProduct[]>;
  buyProduct: (shopId: string, productId: string) => Promise<boolean>;
  canProduceProduct: (shopId: string, productId: string) => Promise<boolean>;
}

export const useBusinessStore = create<BusinessStoreState>((set, get) => ({
  businesses: [],
  isProcessing: false,
  resources: {},
  reports: {},
  orders: {},
  salesHistory: {},

  fetchBusinesses: async () => {
    const { data, error } = await supabase.from('businesses').select('*');
    if (!error) set({ businesses: data || [] });
  },

  getBusinessState: (businessId) => {
    const biz = get().businesses.find(b => b.id === businessId);
    if (!biz) {
      return {
        id: businessId,
        purchased: false,
        owner_id: null,
        daily_earnings: 0,
        purchased_at: null,
        business_balance: 0,
      };
    }
    return {
      id: biz.id,
      purchased: biz.purchased || false,
      owner_id: biz.owner_id,
      daily_earnings: biz.daily_earnings || 0,
      purchased_at: biz.purchased_at,
      business_balance: biz.business_balance || 0,
    };
  },

  buyBusiness: async (businessId) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) {
      alert('Ошибка: игрок не найден!');
      return false;
    }

    const state = get().getBusinessState(businessId);
    if (state.purchased) {
      alert('Этот бизнес уже куплен!');
      return false;
    }

    const locType = get().getLocationType(businessId);
    const bizType = BUSINESS_TYPES[locType];
    if (!bizType) {
      alert('Неизвестный тип бизнеса!');
      return false;
    }

    const price = bizType.purchasePrice;
    if (Number(player.money) < price) {
      alert(`Недостаточно денег! Нужно $${price.toLocaleString()}`);
      return false;
    }

    set({ isProcessing: true });
    try {
      const { error: dbError } = await supabase
        .from('businesses')
        .upsert({
          id: businessId,
          owner_id: player.id,
          purchased: true,
          daily_earnings: bizType.dailyIncome,
          purchased_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (dbError) throw dbError;

      await updateProfile({ money: Number(player.money) - price });
      await get().fetchBusinesses();
      await get().initBusinessResources(businessId);
      alert(`Поздравляем! Вы стали владельцем ${bizType.name.toLowerCase()}!`);
      return true;
    } catch (err) {
      console.error('Ошибка покупки бизнеса:', err);
      alert('Ошибка при покупке бизнеса!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  isPlayerOwner: (businessId) => {
    const player = usePlayerStore.getState().player;
    if (!player) return false;
    const state = get().getBusinessState(businessId);
    return state.purchased && state.owner_id === player.id;
  },

  getDailyEarnings: (businessId) => {
    const state = get().getBusinessState(businessId);
    if (!state.purchased) return 0;
    return state.daily_earnings || 0;
  },

  getLocationType: (businessId) => {
    const parts = businessId.split('_');
    return parts[0] || '';
  },

  initBusinessResources: async (businessId) => {
    const resourceTypes = Object.keys(RESOURCE_TYPES);
    try {
      const records = resourceTypes.map(rt => ({
        business_id: businessId,
        resource_type: rt,
        quantity: 0,
      }));
      const { error } = await supabase
        .from('business_resources')
        .insert(records);
      if (error) throw error;
      await get().fetchResources(businessId);
    } catch (err) {
      console.error('Failed to init business resources:', err);
    }
  },

  fetchResources: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_resources')
        .select('resource_type, quantity')
        .eq('business_id', businessId);
      if (!error && data) {
        const resources: Record<string, number> = {};
        Object.keys(RESOURCE_TYPES).forEach(rt => {
          const found = data.find(d => d.resource_type === rt);
          resources[rt] = found ? Number(found.quantity) : 0;
        });
        set(state => ({ resources: { ...state.resources, [businessId]: resources } }));
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  },

  fetchReports: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_reports')
        .select('resource_type, consumed_hour, consumed_day, consumed_week')
        .eq('business_id', businessId);
      if (!error && data) {
        const reports: Record<string, BusinessReport> = {};
        Object.keys(RESOURCE_TYPES).forEach(rt => {
          const found = data.find(d => d.resource_type === rt);
          reports[rt] = found ? {
            consumed_hour: Number(found.consumed_hour),
            consumed_day: Number(found.consumed_day),
            consumed_week: Number(found.consumed_week),
          } : { consumed_hour: 0, consumed_day: 0, consumed_week: 0 };
        });
        set(state => ({ reports: { ...state.reports, [businessId]: reports } }));
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  },

  fetchOrders: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        set(state => ({ orders: { ...state.orders, [businessId]: data } }));
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  },

  fetchSalesHistory: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_sales_log')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        set(state => ({ salesHistory: { ...state.salesHistory, [businessId]: data } }));
      }
    } catch (err) {
      // Table may not exist yet
    }
  },

  getSalesHistory: (businessId) => {
    return get().salesHistory[businessId] || [];
  },

  loadBusinessData: async (businessId) => {
    await Promise.all([
      get().fetchResources(businessId),
      get().fetchReports(businessId),
      get().fetchOrders(businessId),
      get().fetchSalesHistory(businessId),
    ]);
  },

  placeOrder: async (businessId, resourceType, quantity, pricePerUnit) => {
    const { player } = usePlayerStore.getState();
    if (!player) return false;

    const state = get().getBusinessState(businessId);
    if (!state.purchased || state.owner_id !== player.id) return false;

    const quantityNum = Number(quantity);
    const priceNum = Number(pricePerUnit);
    if (quantityNum <= 0 || priceNum <= 0) return false;

    const totalCost = quantityNum * priceNum;
    if (Number(state.business_balance) < totalCost) {
      alert('Недостаточно средств на счёте бизнеса!');
      return false;
    }

    set({ isProcessing: true });
    try {
      const { error: orderError } = await supabase
        .from('business_orders')
        .insert([{
          business_id: businessId,
          resource_type: resourceType,
          quantity: quantityNum,
          price_per_unit: priceNum,
          total_cost: totalCost,
          status: 'pending',
        }]);
      if (orderError) throw orderError;

      const { error: balanceError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance) - totalCost,
        })
        .eq('id', businessId);
      if (balanceError) throw balanceError;

      await get().fetchBusinesses();
      await get().fetchOrders(businessId);
      alert(`Заказ на ${quantityNum} ед. ${RESOURCE_TYPES[resourceType]?.name || resourceType} создан!`);
      return true;
    } catch (err) {
      console.error('Failed to place order:', err);
      alert('Ошибка при создании заказа!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  depositToBusiness: async (businessId, amount) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const state = get().getBusinessState(businessId);
    if (!state.purchased || state.owner_id !== player.id) return false;

    const amountNum = Number(amount);
    if (amountNum <= 0) return false;
    if (Number(player.money) < amountNum) {
      alert('Недостаточно средств!');
      return false;
    }

    set({ isProcessing: true });
    try {
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) + amountNum,
        })
        .eq('id', businessId);
      if (bizError) throw bizError;

      await updateProfile({ money: Number(player.money) - amountNum });

      await get().fetchBusinesses();
      alert(`Пополнено $${amountNum.toLocaleString()} на счёт бизнеса!`);
      return true;
    } catch (err) {
      console.error('Failed to deposit:', err);
      alert('Ошибка при пополнении!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  withdrawFromBusiness: async (businessId, amount) => {
    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const state = get().getBusinessState(businessId);
    if (!state.purchased || state.owner_id !== player.id) return false;

    const amountNum = Number(amount);
    if (amountNum <= 0) return false;
    if (Number(state.business_balance || 0) < amountNum) {
      alert('Недостаточно средств на счёте бизнеса!');
      return false;
    }

    set({ isProcessing: true });
    try {
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) - amountNum,
        })
        .eq('id', businessId);
      if (bizError) throw bizError;

      await updateProfile({ money: Number(player.money) + amountNum });

      await get().fetchBusinesses();
      alert(`Снято $${amountNum.toLocaleString()} со счёта бизнеса!`);
      return true;
    } catch (err) {
      console.error('Failed to withdraw:', err);
      alert('Ошибка при снятии!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  getResources: (businessId) => {
    return get().resources[businessId] || {};
  },

  getReports: (businessId) => {
    return get().reports[businessId] || {};
  },

  getOrders: (businessId) => {
    return get().orders[businessId] || [];
  },

  getShopProducts: async (shopId) => {
    const { data } = await supabase
      .from('business_products')
      .select('*')
      .eq('business_id', shopId);
    return (data || []).map(d => ({
      id: d.product_id,
      name: d.product_name,
      icon: d.icon || '📦',
      price: Number(d.price),
      resources: d.resources || {},
    }));
  },

  buyProduct: async (shopId, productId) => {
    const products = await get().getShopProducts(shopId);
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const state = get().getBusinessState(shopId);
    if (!state.purchased) {
      if (Number(player.money) < product.price) {
        alert('Недостаточно средств!');
        return false;
      }
      await updateProfile({ money: Number(player.money) - product.price });
      alert(`Куплено: ${product.name}!`);
      return true;
    }

    for (const [resType, qty] of Object.entries(product.resources || {})) {
      const { data: dbRes } = await supabase
        .from('business_resources')
        .select('quantity')
        .eq('business_id', shopId)
        .eq('resource_type', resType)
        .single();

      if ((Number(dbRes?.quantity) || 0) < qty) {
        alert(`Данного товара нет!`);
        set({ isProcessing: false });
        return false;
      }
    }

    if (Number(player.money) < product.price) {
      alert('Недостаточно средств!');
      return false;
    }

    set({ isProcessing: true });
    try {
      await updateProfile({ money: Number(player.money) - product.price });

      const { error: balanceError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) + product.price,
        })
        .eq('id', shopId);
      if (balanceError) throw balanceError;

      for (const [resType, qty] of Object.entries(product.resources || {})) {
        const { data: dbRes } = await supabase
          .from('business_resources')
          .select('quantity')
          .eq('business_id', shopId)
          .eq('resource_type', resType)
          .single();

        const currentQty = Number(dbRes?.quantity) || 0;
        const newQty = Math.max(0, currentQty - qty);

        await supabase
          .from('business_resources')
          .update({ quantity: newQty })
          .eq('business_id', shopId)
          .eq('resource_type', resType);
      }

      for (const [resType, qty] of Object.entries(product.resources || {})) {
        const { data: reportData } = await supabase
          .from('business_reports')
          .select('consumed_hour, consumed_day, consumed_week')
          .eq('business_id', shopId)
          .eq('resource_type', resType)
          .single();

        await supabase
          .from('business_reports')
          .upsert(
            {
              business_id: shopId,
              resource_type: resType,
              consumed_hour: Number(reportData?.consumed_hour || 0) + qty,
              consumed_day: Number(reportData?.consumed_day || 0) + qty,
              consumed_week: Number(reportData?.consumed_week || 0) + qty,
            },
            { onConflict: 'business_id,resource_type' }
          );
      }

      try {
        await supabase
          .from('business_sales_log')
          .insert({
            business_id: shopId,
            product_id: product.id,
            product_name: product.name,
            player_id: player.id,
            sale_price: product.price,
            resources_consumed: product.resources || {},
          });
      } catch (e) {
        // Table may not exist yet
      }

      await get().fetchBusinesses();
      await get().fetchResources(shopId);
      await get().fetchReports(shopId);
      alert(`Куплено: ${product.name}!`);
      return true;
    } catch (err) {
      console.error('Failed to buy product:', err);
      alert('Ошибка при покупке!');
      return false;
    } finally {
      set({ isProcessing: false });
    }
  },

  canProduceProduct: async (shopId, productId) => {
    const products = await get().getShopProducts(shopId);
    const product = products.find(p => p.id === productId);
    if (!product) return true;
    const resources = get().getResources(shopId) || {};
    for (const [resType, qty] of Object.entries(product.resources || {})) {
      if ((resources[resType] || 0) < qty) return false;
    }
    return true;
  },
}));