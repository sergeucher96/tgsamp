import React, { useState, useEffect } from 'react';
import { VEHICLE_DATABASE, VEHICLE_COLORS } from '../data/vehicleConfig';
import { carThumbnailService } from '../utils/carThumbnailGenerator';
import { Loader2 } from 'lucide-react';

export default function CarPreviewImage({
  modelId,
  color,
  viewMode = 'iso', // 'iso' (для гаража) или 'map' (вид сверху для карты)
  className = 'w-12 h-12 object-contain',
  alt = 'Car'
}) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  const vehicleCfg = VEHICLE_DATABASE[modelId];
  const model3d = vehicleCfg?.model3d || '/models/cars/test.glb';

  // Преобразуем имя цвета ('red', 'blue') в HEX ('#EF4444')
  const colorHex = VEHICLE_COLORS.find(c => c.id === color)?.hex || color || '#FFFFFF';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    carThumbnailService.generateCarPNG(model3d, colorHex, 0, viewMode)
      .then((dataUrl) => {
        if (isMounted) {
          setImgSrc(dataUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Ошибка создания превью машины:', err);
        if (isMounted) {
          setImgSrc('/car.png');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [model3d, colorHex, viewMode]);

  if (loading && !imgSrc) {
    return (
      <div className={`flex items-center justify-center bg-white/[0.03] rounded-xl ${className}`}>
        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={imgSrc || '/car.png'}
      alt={alt}
      className={className}
      onError={(e) => { e.currentTarget.src = '/car.png'; }}
    />
  );
}