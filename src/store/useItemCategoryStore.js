import { create } from 'zustand';
import { supabase } from '../api/supabase';

export const useItemCategoryStore = create((set, get) => ({
  // State
  categories: [],
  properties: [],
  effects: [],
  actions: [],
  tags: [],
  items: [],
  // Category-tree links
  categoryProperties: [],
  categoryEffectsAllowed: [],
  categoryEffectsDenied: [],
  categoryActions: [],
  categoryTags: [],
  loading: false,

  // ============ LOADING ============

  loadAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().loadCategories(),
      get().loadProperties(),
      get().loadEffects(),
      get().loadActions(),
      get().loadTags(),
      get().loadItems(),
    ]);
    set({ loading: false });
  },

  loadCategories: async () => {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*, parent:parent_id (name, key, icon, parent_id)')
      .order('id');
    if (!error && data) set({ categories: data });
  },

  loadProperties: async () => {
    const { data } = await supabase
      .from('item_properties')
      .select('*')
      .order('id');
    if (data) set({ properties: data });
  },

  loadEffects: async () => {
    const { data } = await supabase
      .from('item_effects')
      .select('*')
      .order('id');
    if (data) set({ effects: data });
  },

  loadActions: async () => {
    const { data } = await supabase
      .from('item_actions')
      .select('*')
      .order('id');
    if (data) set({ actions: data });
  },

  loadTags: async () => {
    const { data } = await supabase
      .from('item_tags')
      .select('*')
      .order('id');
    if (data) set({ tags: data });
  },

  loadItems: async () => {
    const { data } = await supabase
      .from('items_db')
      .select('*, category:category_id (id, name, key, icon, parent_id)')
      .order('id');
    if (data) set({ items: data });
  },

  // Load category details (properties, effects, actions, tags with inheritance)
  loadCategoryDetails: async (categoryId) => {
    const [
      propsRes,
      effectsAllowedRes,
      effectsDeniedRes,
      actionsRes,
      tagsRes,
    ] = await Promise.all([
      supabase.from('category_properties').select('*, property:property_id(*)').eq('category_id', categoryId),
      supabase.from('category_effects_allowed').select('*, effect:effect_id(*)').eq('category_id', categoryId),
      supabase.from('category_effects_denied').select('*, effect:effect_id(*)').eq('category_id', categoryId),
      supabase.from('category_actions_link').select('*, action:action_id(*)').eq('category_id', categoryId),
      supabase.from('category_tags_link').select('*, tag:tag_id(*)').eq('category_id', categoryId),
    ]);

    set({
      categoryProperties: propsRes.data || [],
      categoryEffectsAllowed: effectsAllowedRes.data || [],
      categoryEffectsDenied: effectsDeniedRes.data || [],
      categoryActions: actionsRes.data || [],
      categoryTags: tagsRes.data || [],
    });
  },

  // ============ CATEGORY CRUD ============

  createCategory: async (data) => {
    const { data: result, error } = await supabase
      .from('item_categories')
      .insert([data])
      .select('*, parent:parent_id (name, key, icon, parent_id)')
      .single();
    if (!error) {
      set(state => ({ categories: [...state.categories, result] }));
      return result;
    }
    return null;
  },

  updateCategory: async (id, data) => {
    const { data: result, error } = await supabase
      .from('item_categories')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, parent:parent_id (name, key, icon, parent_id)')
      .single();
    if (!error) {
      set(state => ({
        categories: state.categories.map(c => c.id === id ? result : c),
      }));
      return result;
    }
    return null;
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('item_categories').delete().eq('id', id);
    if (!error) {
      set(state => ({
        categories: state.categories.filter(c => c.id !== id),
      }));
      return true;
    }
    return false;
  },

  // ============ CATEGORY LINKS (properties, effects, actions, tags) ============

  addCategoryProperty: async (categoryId, propertyId, isRequired = false, defaultValue = null) => {
    const { data, error } = await supabase
      .from('category_properties')
      .insert([{ category_id: categoryId, property_id: propertyId, is_required: isRequired, default_value: defaultValue }])
      .select('*, property:property_id(*)')
      .single();
    if (!error) {
      set(state => ({ categoryProperties: [...state.categoryProperties, data] }));
      return data;
    }
    return null;
  },

  removeCategoryProperty: async (categoryId, propertyId) => {
    const { error } = await supabase.from('category_properties').delete().eq('category_id', categoryId).eq('property_id', propertyId);
    if (!error) {
      set(state => ({
        categoryProperties: state.categoryProperties.filter(cp => !(cp.category_id === categoryId && cp.property_id === propertyId)),
      }));
      return true;
    }
    return false;
  },

  addCategoryEffectAllowed: async (categoryId, effectId, defaultValue = null) => {
    const { data, error } = await supabase
      .from('category_effects_allowed')
      .insert([{ category_id: categoryId, effect_id: effectId, default_value: defaultValue }])
      .select('*, effect:effect_id(*)')
      .single();
    if (!error) {
      set(state => ({ categoryEffectsAllowed: [...state.categoryEffectsAllowed, data] }));
      return data;
    }
    return null;
  },

  removeCategoryEffectAllowed: async (categoryId, effectId) => {
    const { error } = await supabase.from('category_effects_allowed').delete().eq('category_id', categoryId).eq('effect_id', effectId);
    if (!error) {
      set(state => ({
        categoryEffectsAllowed: state.categoryEffectsAllowed.filter(ce => !(ce.category_id === categoryId && ce.effect_id === effectId)),
      }));
      return true;
    }
    return false;
  },

  addCategoryEffectDenied: async (categoryId, effectId) => {
    const { data, error } = await supabase
      .from('category_effects_denied')
      .insert([{ category_id: categoryId, effect_id: effectId }])
      .select('*, effect:effect_id(*)')
      .single();
    if (!error) {
      set(state => ({ categoryEffectsDenied: [...state.categoryEffectsDenied, data] }));
      return data;
    }
    return null;
  },

  removeCategoryEffectDenied: async (categoryId, effectId) => {
    const { error } = await supabase.from('category_effects_denied').delete().eq('category_id', categoryId).eq('effect_id', effectId);
    if (!error) {
      set(state => ({
        categoryEffectsDenied: state.categoryEffectsDenied.filter(ce => !(ce.category_id === categoryId && ce.effect_id === effectId)),
      }));
      return true;
    }
    return false;
  },

  addCategoryAction: async (categoryId, actionId) => {
    const { data, error } = await supabase
      .from('category_actions_link')
      .insert([{ category_id: categoryId, action_id: actionId }])
      .select('*, action:action_id(*)')
      .single();
    if (!error) {
      set(state => ({ categoryActions: [...state.categoryActions, data] }));
      return data;
    }
    return null;
  },

  removeCategoryAction: async (categoryId, actionId) => {
    const { error } = await supabase.from('category_actions_link').delete().eq('category_id', categoryId).eq('action_id', actionId);
    if (!error) {
      set(state => ({
        categoryActions: state.categoryActions.filter(ca => !(ca.category_id === categoryId && ca.action_id === actionId)),
      }));
      return true;
    }
    return false;
  },

  addCategoryTag: async (categoryId, tagId, isAutomatic = false) => {
    const { data, error } = await supabase
      .from('category_tags_link')
      .insert([{ category_id: categoryId, tag_id: tagId, is_automatic: isAutomatic }])
      .select('*, tag:tag_id(*)')
      .single();
    if (!error) {
      set(state => ({ categoryTags: [...state.categoryTags, data] }));
      return data;
    }
    return null;
  },

  removeCategoryTag: async (categoryId, tagId) => {
    const { error } = await supabase.from('category_tags_link').delete().eq('category_id', categoryId).eq('tag_id', tagId);
    if (!error) {
      set(state => ({
        categoryTags: state.categoryTags.filter(ct => !(ct.category_id === categoryId && ct.tag_id === tagId)),
      }));
      return true;
    }
    return false;
  },

  // ============ ITEM CRUD ============

  createItem: async (data) => {
    const { data: result, error } = await supabase
      .from('items_db')
      .insert([data])
      .select('*, category:category_id (id, name, key, icon, parent_id)')
      .single();
    if (!error) {
      set(state => ({ items: [...state.items, result] }));
      return result;
    }
    return null;
  },

  updateItem: async (id, data) => {
    const { data: result, error } = await supabase
      .from('items_db')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:category_id (id, name, key, icon, parent_id)')
      .single();
    if (!error) {
      set(state => ({
        items: state.items.map(i => i.id === id ? result : i),
      }));
      return result;
    }
    return null;
  },

  deleteItem: async (id) => {
    const { error } = await supabase.from('items_db').delete().eq('id', id);
    if (!error) {
      set(state => ({
        items: state.items.filter(i => i.id !== id),
      }));
      return true;
    }
    return false;
  },

  // ============ INHERITANCE HELPERS ============

  getInheritedProperties: (categoryId) => {
    const cat = get().categories.find(c => c.id === categoryId);
    if (!cat) return [];
    const ancestors = getCategoryAncestors(cat, get().categories);
    const allProps = [];
    const seen = new Set();
    // Build from root to leaf
    for (const ancestor of ancestors) {
      const links = get().categoryProperties.filter(cp => cp.category_id === ancestor.id);
      for (const link of links) {
        const prop = get().properties.find(p => p.id === link.property_id);
        if (prop && !seen.has(prop.id)) {
          seen.add(prop.id);
          allProps.push({ ...prop, isRequired: link.is_required, defaultValue: link.default_value, inheritedFrom: ancestor.name });
        }
      }
    }
    return allProps;
  },

  getInheritedEffects: (categoryId) => {
    const cat = get().categories.find(c => c.id === categoryId);
    if (!cat) return { allowed: [], denied: [] };
    const ancestors = getCategoryAncestors(cat, get().categories);
    const allowed = [];
    const denied = [];
    const seenAllowed = new Set();
    const seenDenied = new Set();
    for (const ancestor of ancestors) {
      const allowedLinks = get().categoryEffectsAllowed.filter(ce => ce.category_id === ancestor.id);
      for (const link of allowedLinks) {
        const eff = get().effects.find(e => e.id === link.effect_id);
        if (eff && !seenAllowed.has(eff.id)) {
          seenAllowed.add(eff.id);
          allowed.push({ ...eff, defaultValue: link.default_value, inheritedFrom: ancestor.name });
        }
      }
      const deniedLinks = get().categoryEffectsDenied.filter(ce => ce.category_id === ancestor.id);
      for (const link of deniedLinks) {
        const eff = get().effects.find(e => e.id === link.effect_id);
        if (eff && !seenDenied.has(eff.id)) {
          seenDenied.add(eff.id);
          denied.push({ ...eff, inheritedFrom: ancestor.name });
        }
      }
    }
    return { allowed, denied };
  },

  getInheritedActions: (categoryId) => {
    const cat = get().categories.find(c => c.id === categoryId);
    if (!cat) return [];
    const ancestors = getCategoryAncestors(cat, get().categories);
    const allActions = [];
    const seen = new Set();
    for (const ancestor of ancestors) {
      const links = get().categoryActions.filter(ca => ca.category_id === ancestor.id);
      for (const link of links) {
        const act = get().actions.find(a => a.id === link.action_id);
        if (act && !seen.has(act.id)) {
          seen.add(act.id);
          allActions.push({ ...act, inheritedFrom: ancestor.name });
        }
      }
    }
    return allActions;
  },

  getInheritedTags: (categoryId) => {
    const cat = get().categories.find(c => c.id === categoryId);
    if (!cat) return { automatic: [], recommended: [] };
    const ancestors = getCategoryAncestors(cat, get().categories);
    const automatic = [];
    const recommended = [];
    const seenAuto = new Set();
    const seenRec = new Set();
    for (const ancestor of ancestors) {
      const links = get().categoryTags.filter(ct => ct.category_id === ancestor.id);
      for (const link of links) {
        const tag = get().tags.find(t => t.id === link.tag_id);
        if (tag) {
          if (link.is_automatic && !seenAuto.has(tag.id)) {
            seenAuto.add(tag.id);
            automatic.push({ ...tag, inheritedFrom: ancestor.name });
          } else if (!link.is_automatic && !seenRec.has(tag.id)) {
            seenRec.add(tag.id);
            recommended.push({ ...tag, inheritedFrom: ancestor.name });
          }
        }
      }
    }
    return { automatic, recommended };
  },

  // Get child categories
  getChildCategories: (categoryId) => {
    return get().categories.filter(c => c.parent_id === categoryId);
  },
}));

// Pure helper — build ancestor chain from root to self
function getCategoryAncestors(cat, allCats) {
  const ancestors = [];
  let current = cat;
  while (current) {
    ancestors.unshift(current);
    current = allCats.find(c => c.id === current.parent_id) || null;
  }
  return ancestors;
}