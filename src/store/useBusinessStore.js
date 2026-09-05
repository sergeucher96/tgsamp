import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { usePlayerStore } from './usePlayerStore';
import { BUSINESS_TYPES, RESOURCE_TYPES } from '../data/businessConfig';

export const useBusinessStore = create((set, get) => ({
  businesses: [],
  isProcessing: false,
  resources: {},
  reports: {},
  orders: {},
  salesHistory: {},     // { businessId: [{ product_id, product_name, buyer_name, price, resource_changes, sale_amount, created_at }, ...] }

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

  // Initialize resources for a newly purchased business (only inserts if not exists)
  initBusinessResources: async (businessId) => {
    const resourceTypes = Object.keys(RESOURCE_TYPES);
    try {
      const records = resourceTypes.map(rt => ({
        business_id: businessId,
        resource_type: rt,
        quantity: 0,
      }));
      // Use insert with ON CONFLICT DO NOTHING so existing resources are NOT overwritten
      const { error } = await supabase
        .from('business_resources')
        .insert(records);
      if (error) throw error;
      await get().fetchResources(businessId);
    } catch (err) {
      console.error('Failed to init business resources:', err);
    }
  },

  // Fetch warehouse resources
  fetchResources: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_resources')
        .select('resource_type, quantity')
        .eq('business_id', businessId);
      if (!error && data) {
        const resources = {};
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

  // Fetch reports
  fetchReports: async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('business_reports')
        .select('resource_type, consumed_hour, consumed_day, consumed_week')
        .eq('business_id', businessId);
      if (!error && data) {
        const reports = {};
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

  // Fetch orders
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

  // Fetch sales history
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

  // Get sales history for a business
  getSalesHistory: (businessId) => {
    return get().salesHistory[businessId] || [];
  },

  // Load all data for a business
  loadBusinessData: async (businessId) => {
    await Promise.all([
      get().fetchResources(businessId),
      get().fetchReports(businessId),
      get().fetchOrders(businessId),
      get().fetchSalesHistory(businessId),
    ]);
  },

  // Place an order for resources
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
      // Create order
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

      // Deduct from balance
      const { error: balanceError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance) - totalCost,
        })
        .eq('id', businessId);
      if (balanceError) throw balanceError;

      // Refresh data
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

  // Deposit money into business account from player's money
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
      // Update business balance
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) + amountNum,
        })
        .eq('id', businessId);
      if (bizError) throw bizError;

      // Deduct from player money
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

  // Withdraw money from business account to player's money
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
      // Update business balance
      const { error: bizError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) - amountNum,
        })
        .eq('id', businessId);
      if (bizError) throw bizError;

      // Add to player money
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

  // Get current resources for a business
  getResources: (businessId) => {
    return get().resources[businessId] || {};
  },

  // Get current reports for a business
  getReports: (businessId) => {
    return get().reports[businessId] || {};
  },

  // Get current orders for a business
  getOrders: (businessId) => {
    return get().orders[businessId] || [];
  },

  // Get products for a shop — from DB (business_products) only
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

  // Buy product from business: deduct player money, credit business balance, consume resources
  buyProduct: async (shopId, productId) => {
    const products = await get().getShopProducts(shopId);
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const { player, updateProfile } = usePlayerStore.getState();
    if (!player) return false;

    const state = get().getBusinessState(shopId);
    if (!state.purchased) {
      // Not owned by anyone — player pays normal price, no resource consumption
      if (Number(player.money) < product.price) {
        alert('Недостаточно средств!');
        return false;
      }
      await updateProfile({ money: Number(player.money) - product.price });
      alert(`Куплено: ${product.name}!`);
      return true;
    }

    // Business is purchased — check resources from DB (same for owner and non-owner)
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
      // Deduct from player
      await updateProfile({ money: Number(player.money) - product.price });

      // Credit business balance
      const { error: balanceError } = await supabase
        .from('businesses')
        .update({
          business_balance: Number(state.business_balance || 0) + product.price,
        })
        .eq('id', shopId);
      if (balanceError) throw balanceError;

      // Consume resources — read current qty from DB each time
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

      // Update reports — track consumption
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

      // Log sale to business_sales_log
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

      // Refresh
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

  // Check if business has enough resources for a product
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
