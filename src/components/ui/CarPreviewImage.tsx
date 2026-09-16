import React, { useState, useEffect } from 'react';
import { VEHICLE_DATABASE, VEHICLE_COLORS, VehicleConfig } from '../../features/vehicles/data/vehicleConfig';
import { carThumbnailService } from '../../game/rendering/carThumbnailGenerator';
import { Loader2 } from 'lucide-react';

type ViewMode = 'iso' | 'map';

interface CarPreviewImageProps {
  modelId: string;
  color?: string;
  viewMode?: ViewMode;
  className?: string;
  alt?: string;
}

export default function CarPreviewImage({
  modelId,
  color,
  viewMode = 'iso',
  className = 'w-12 h-12 object-contain',
  alt = 'Car'
}: CarPreviewImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const vehicleCfg: VehicleConfig | undefined = VEHICLE_DATABASE[modelId];
  const model3d: string = vehicleCfg?.model3d || '/models/cars/test.glb';

  // Преобразуем имя цвета ('red', 'blue') в HEX ('#EF4444')
  const colorHex: string = VEHICLE_COLORS.find((c) => c.id === color)?.hex || color || '#FFFFFF';

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    carThumbnailService.generateCarPNG(model3d, colorHex, 0, viewMode)
      .then((dataUrl: string) => {
        if (isMounted) {
          setImgSrc(dataUrl);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
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
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = '/car.png';
      }}
    />
  );
}