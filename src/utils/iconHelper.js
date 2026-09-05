export const isImageIcon = (val) => {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim();
  if (!v) return false;
  if (v.startsWith('data:image')) return true;
  if (v.startsWith('/')) return true;
  if (/\.(png|webp|jpg|jpeg|gif|svg)$/i.test(v)) return true;
  return false;
};
