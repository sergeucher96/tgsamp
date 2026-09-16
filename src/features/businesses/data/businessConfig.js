export const BUSINESS_TYPES = {
  shop: { name: 'Магазин', purchasePrice: 150000, dailyIncome: 3000, icon: '�' },
  clothes: { name: 'Магазин одежды', purchasePrice: 180000, dailyIncome: 3500, icon: '�' },
  bar: { name: 'Бар', purchasePrice: 200000, dailyIncome: 4000, icon: '🍺' },
  nightclub: { name: 'Ночной клуб', purchasePrice: 300000, dailyIncome: 6000, icon: '💃' },
  hotel: { name: 'Отель', purchasePrice: 200000, dailyIncome: 5000, icon: '🏨' },
  gas: { name: 'АЗС', purchasePrice: 250000, dailyIncome: 5500, icon: '⛽' },
  parking: { name: 'Парковка', purchasePrice: 100000, dailyIncome: 2000, icon: '🅿️' },
  gym: { name: 'Спортзал', purchasePrice: 170000, dailyIncome: 3500, icon: '💪' },
  warehouse: { name: 'Склад', purchasePrice: 120000, dailyIncome: 2500, icon: '📦' },
  cafeteria: { name: 'Столовая', purchasePrice: 100000, dailyIncome: 2000, icon: '🍲' },
};

export const BUSINESS_CATEGORIES = {
  residential: ['house'],
  business: ['shop', 'clothes', 'bar', 'nightclub', 'hotel', 'gas', 'parking', 'gym', 'warehouse', 'cafeteria'],
  municipal: ['bank', 'atm', 'job', 'driving_school', 'gun_range', 'tuning', 'public', 'farm', 'oil_rig'],
};

// Developer-only product catalog for owned businesses
// Product resource costs are consumed from business warehouse when player buys
export const BUSINESS_PRODUCTS = {
  // 24/7 Shop products
  shop_24_7: [
    { id: 'phone', name: 'Телефон', icon: '📱', price: 1500, resources: { oil: 5, microchip: 2 } },
    { id: 'sim_card', name: 'SIM-карта', icon: '💳', price: 100, resources: { microchip: 1 } },
    { id: 'repair_kit', name: 'Ремонтный набор', icon: '🔧', price: 500, resources: { metal: 2, oil: 1 } },
    { id: 'apple', name: 'Яблоко', icon: '🍎', price: 50, resources: { crop: 1 } },
    { id: 'cucumber', name: 'Огурец', icon: '🥒', price: 100, resources: { crop: 1 } },
    { id: 'tomato', name: 'Помидор', icon: '🍅', price: 100, resources: { crop: 1 } },
    { id: 'salt', name: 'Соль', icon: '🧂', price: 50, resources: {} },
  ],
  // Clothes shop products
  clothes_1: [
    { id: 'cap_basic', name: 'Бейсболка', icon: '🧢', price: 800, resources: { crop: 3 } },
    { id: 'tshirt_basic', name: 'Футболка', icon: '👕', price: 500, resources: { crop: 2 } },
    { id: 'pants_cargo', name: 'Карго штаны', icon: '👖', price: 1200, resources: { crop: 5 } },
    { id: 'sneakers_basic', name: 'Кроссовки', icon: '👟', price: 1500, resources: { oil: 3, crop: 2 } },
    { id: 'helmet_tactical', name: 'Тактический шлем', icon: '🪖', price: 5000, resources: { metal: 5, part: 2 } },
    { id: 'chain_silver', name: 'Серебряная цепь', icon: '📿', price: 3000, resources: { metal: 3 } },
    { id: 'chain_gold', name: 'Золотая цепь', icon: '⛓', price: 12000, resources: { metal: 10 } },
    { id: 'chain_diamond', name: 'Алмазная цепь', icon: '💎', price: 50000, resources: { metal: 20, microchip: 5 } },
    { id: 'jacket_leather', name: 'Кожаная куртка', icon: '🧥', price: 8000, resources: { crop: 10, metal: 3 } },
    { id: 'vest_tactical', name: 'Тактическая жилетка', icon: '🦺', price: 25000, resources: { metal: 8, part: 3 } },
    { id: 'gloves_basic', name: 'Перчатки', icon: '🧤', price: 600, resources: { crop: 2 } },
    { id: 'boots_heavy', name: 'Тяжёлые ботинки', icon: '🥾', price: 2500, resources: { crop: 4, oil: 2 } },
  ],
}

export const RESOURCE_TYPES = {
  crop: { name: 'Урожай', icon: '🌾', color: '#84cc16' },
  oil: { name: 'Нефть', icon: '🛢️', color: '#3b82f6' },
  metal: { name: 'Металл', icon: '🔩', color: '#f59e0b' },
  part: { name: 'Деталь', icon: '⚙️', color: '#a855f7' },
  microchip: { name: 'Микросхема', icon: '💾', color: '#06b6d4' },
};
