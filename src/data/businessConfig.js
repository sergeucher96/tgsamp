export const BUSINESS_TYPES = {
  shop: { name: 'Магазин', purchasePrice: 150000, dailyIncome: 3000, icon: '🛒' },
  clothes: { name: 'Магазин одежды', purchasePrice: 180000, dailyIncome: 3500, icon: '👕' },
  bar: { name: 'Бар', purchasePrice: 200000, dailyIncome: 4000, icon: '🍺' },
  nightclub: { name: 'Ночной клуб', purchasePrice: 300000, dailyIncome: 6000, icon: '💃' },
  hotel: { name: 'Отель', purchasePrice: 200000, dailyIncome: 5000, icon: '🏨' },
  gas: { name: 'АЗС', purchasePrice: 250000, dailyIncome: 5500, icon: '⛽' },
  parking: { name: 'Парковка', purchasePrice: 100000, dailyIncome: 2000, icon: '🅿️' },
  gym: { name: 'Спортзал', purchasePrice: 170000, dailyIncome: 3500, icon: '💪' },
  warehouse: { name: 'Склад', purchasePrice: 120000, dailyIncome: 2500, icon: '📦' },
};

export const BUSINESS_CATEGORIES = {
  residential: ['house'],
  business: ['shop', 'clothes', 'bar', 'nightclub', 'hotel', 'gas', 'parking', 'gym', 'warehouse'],
  municipal: ['bank', 'atm', 'job', 'driving_school', 'gun_range', 'tuning', 'public'],
};
