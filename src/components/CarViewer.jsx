import React, { useState, Suspense, useEffect, lazy, useCallback } from 'react';
import { X, Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const CarScene = lazy(() => import('./CarScene'));

export default function CarViewer({ model = '/models/cars/test.glb', onClose, carData }) {
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const autoRotateRef = null;

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleRotate = (dir) => {
    setRotation((prev) => prev + dir * (Math.PI / 4));
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex flex-col text-white font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">3D Просмотр</p>
            <h2 className="text-sm font-black uppercase italic tracking-tight">
              {carData?.name || 'Автомобиль'}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto p-3 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md"
        >
          <X size={18} />
        </button>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-[10px] font-black uppercase text-emerald-500 mt-4 tracking-[0.3em] animate-pulse">
              Загрузка 3D модели...
            </p>
          </div>
        }>
          <CarScene model={model} rotation={rotation} carData={carData} />
        </Suspense>
      </div>

      {/* Controls */}
      {loaded && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
          <button
            onClick={() => handleRotate(-1)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 active:scale-90 transition-all"
          >
            <RotateCcw size={18} className="-scale-x-100" />
          </button>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <p className="text-[9px] font-black uppercase text-slate-300 tracking-wider text-center">
              Свайп для вращения
            </p>
          </div>
          <button
            onClick={() => handleRotate(1)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 active:scale-90 transition-all"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}
    </div>
  );
}