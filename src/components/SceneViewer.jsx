// src/components/SceneViewer.jsx
// Обновлённый SceneViewer с поддержкой отображения 3D Хотспотов и Объектов
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sky, PointerLockControls, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Settings, X, RotateCcw, Camera, Sparkles } from 'lucide-react';
import * as THREE from 'three';

const COLOR_MAP = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  red: '#ef4444',
};

function CameraPositionReader({ onUpdate }) {
  const { camera } = useThree();
  useEffect(() => {
    const interval = setInterval(() => {
      const pos = camera.position.toArray();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const quat = camera.quaternion;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      const target = [
        pos[0] + forward.x * 100,
        pos[1] + forward.y * 100,
        pos[2] + forward.z * 100,
      ];
      onUpdate({
        pos,
        dir: { x: dir.x, y: dir.y, z: dir.z },
        target,
      });
    }, 200);
    return () => clearInterval(interval);
  }, [camera, onUpdate]);
  return null;
}

function FreeCameraController({ onFreeLook }) {
  const { camera } = useThree();
  const keys = useRef({});
  const locked = useRef(false);
  const speed = 15;

  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastTime = performance.now();
    const animate = () => {
      requestAnimationFrame(animate);
      if (!locked.current) return;
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const moveDir = new THREE.Vector3();
      if (keys.current['KeyW']) moveDir.z -= 1;
      if (keys.current['KeyS']) moveDir.z += 1;
      if (keys.current['KeyA']) moveDir.x -= 1;
      if (keys.current['KeyD']) moveDir.x += 1;
      if (keys.current['Space']) moveDir.y += 1;
      if (keys.current['ShiftLeft']) moveDir.y -= 1;

      moveDir.applyQuaternion(camera.quaternion);
      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(speed * delta);
        camera.position.add(moveDir);
      }
    };
    animate();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [camera, speed]);

  useEffect(() => {
    locked.current = onFreeLook;
  }, [onFreeLook]);

  return onFreeLook ? <PointerLockControls /> : null;
}

function SceneModel({ url, scale = 1 }) {
  const [scene, setScene] = useState(null);
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        setScene(gltf.scene);
      },
      undefined,
      () => console.error('Failed to load scene:', url)
    );
  }, [url]);

  if (!scene) return null;
  return <primitive object={scene} scale={scale} />;
}

// 3D Маркер хотспота
function HotspotMarker3D({ hotspot, onInteract }) {
  const hex = COLOR_MAP[hotspot.color] || '#10b981';
  const size = hotspot.size || [1.2, 1.4, 1.2];

  return (
    <group position={hotspot.position}>
      {/* Объёмный триггер */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onInteract(hotspot);
        }}
      >
        <boxGeometry args={size} />
        <meshBasicMaterial color={hex} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Напольное кольцо */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -size[1] / 2 + 0.02, 0]}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshBasicMaterial color={hex} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Голографический кристалл */}
      <mesh position={[0, size[1] / 2 + 0.3, 0]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color={hex} emissive={hex} emissiveIntensity={0.6} />
      </mesh>

      {/* Экранный 2D бейдж с текстом */}
      <Html position={[0, size[1] / 2 + 0.7, 0]} center distanceFactor={20}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onInteract(hotspot);
          }}
          className="px-2.5 py-1 bg-slate-950/90 border border-slate-700 text-white rounded-xl shadow-2xl flex items-center gap-1.5 cursor-pointer select-none hover:scale-105 transition"
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
          <span className="text-xs font-bold whitespace-nowrap">{hotspot.title}</span>
          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
            {hotspot.action}
          </span>
        </div>
      </Html>
    </group>
  );
}

const DEFAULT_POS = [21.848, -32.297, -15.834];
const DEFAULT_TARGET = [0, 0, 0];

export default function SceneViewer({
  url = '/models/myscene.glb',
  cameraPosition = DEFAULT_POS,
  target = DEFAULT_TARGET,
  scale = 1,
  showSky = true,
  enableZoom = true,
  minDistance = 5,
  maxDistance = 200,
  onClose,
  onOpenEditor,
  locationId,
}) {
  const [showEditor, setShowEditor] = useState(false);
  const [camPos, setCamPos] = useState([...cameraPosition]);
  const [camTarget, setCamTarget] = useState([...target]);
  const [liveData, setLiveData] = useState({
    pos: [...cameraPosition],
    dir: { x: 0, y: 0, z: 0 },
    target: [...target],
  });
  const [freeLook, setFreeLook] = useState(false);
  const [loadedHotspots, setLoadedHotspots] = useState([]);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const orbitRef = useRef(null);

  // Загружаем сохранённые 3D хотспоты из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tgsamp_3d_hotspots_v1');
      if (!raw) return;
      const all = JSON.parse(raw);
      if (locationId && all[locationId]?.hotspots) {
        setLoadedHotspots(all[locationId].hotspots);
      } else {
        const collected = [];
        Object.values(all).forEach((locData) => {
          if (locData?.hotspots && Array.isArray(locData.hotspots)) {
            collected.push(...locData.hotspots);
          }
        });
        setLoadedHotspots(collected);
      }
    } catch (e) {
      console.warn('Could not load saved hotspots into SceneViewer:', e);
    }
  }, [locationId]);

  useEffect(() => {
    if (!freeLook && orbitRef.current) {
      orbitRef.current.object.position.set(camPos[0], camPos[1], camPos[2]);
      orbitRef.current.target.set(camTarget[0], camTarget[1], camTarget[2]);
      orbitRef.current.update();
    }
  }, [freeLook, camPos, camTarget]);

  const handleSave = () => {
    setCamPos([...liveData.pos]);
    setCamTarget([...liveData.target]);
    setFreeLook(false);
  };

  const handleReset = () => {
    setCamPos([...DEFAULT_POS]);
    setCamTarget([...DEFAULT_TARGET]);
    setFreeLook(false);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none" style={{ background: '#020617' }}>
      {/* Top controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {!freeLook && (
          <button
            onClick={() => setFreeLook(true)}
            className="p-3 rounded-xl backdrop-blur-md border bg-amber-600/80 border-amber-400/30 text-white hover:bg-amber-500 transition-all shadow-lg"
            title="Свободный полёт камеры (WASD)"
          >
            <Camera size={18} />
          </button>
        )}

        {onOpenEditor && (
          <button
            onClick={onOpenEditor}
            className="px-3 py-2.5 rounded-xl backdrop-blur-md border bg-emerald-600/80 border-emerald-400/30 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg"
          >
            <Sparkles size={16} />
            <span>3D Редактор хотспотов</span>
          </button>
        )}
      </div>

      {freeLook && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-2 rounded-xl backdrop-blur-md border bg-amber-600/20 border-amber-400/30">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
              🎮 Свободная камера
            </p>
          </div>
        </div>
      )}

      {/* Top right buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 text-white transition"
          title="Настройки камеры"
        >
          <Settings size={18} />
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="p-3 bg-red-600/30 hover:bg-red-600/50 rounded-xl backdrop-blur-md border border-red-400/30 text-red-300 hover:text-white transition"
            title="Закрыть 3D сцену"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Editor panel */}
      {showEditor && (
        <div className="absolute top-16 right-4 z-20 w-64 bg-[#020617]/90 backdrop-blur-md rounded-xl border border-white/10 p-4 text-white shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Редактор камеры
            </p>
            <button onClick={() => setShowEditor(false)}>
              <X size={14} />
            </button>
          </div>
          <p className="text-[8px] uppercase text-slate-400 mb-1">Позиция</p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {['x', 'y', 'z'].map((axis, i) => (
              <input
                key={axis}
                type="number"
                step="0.1"
                value={camPos[i]}
                onChange={(e) => {
                  const v = [...camPos];
                  v[i] = parseFloat(e.target.value) || 0;
                  setCamPos(v);
                }}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
              />
            ))}
          </div>
          <p className="text-[8px] uppercase text-slate-400 mb-1">Цель</p>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {['x', 'y', 'z'].map((axis, i) => (
              <input
                key={axis}
                type="number"
                step="0.1"
                value={camTarget[i]}
                onChange={(e) => {
                  const v = [...camTarget];
                  v[i] = parseFloat(e.target.value) || 0;
                  setCamTarget(v);
                }}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
              />
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 text-[9px] font-black uppercase bg-emerald-600/80 hover:bg-emerald-500 rounded-lg border border-emerald-400/30 flex items-center justify-center gap-1"
            >
              📸 Сохранить
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2 text-[9px] font-black uppercase bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 flex items-center justify-center gap-1"
            >
              <RotateCcw size={12} /> Сброс
            </button>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-[8px] uppercase text-slate-400 mb-1">Текущая позиция</p>
            <p className="text-[9px] text-slate-300 font-mono">
              X: {liveData.pos[0]?.toFixed(1)} Y: {liveData.pos[1]?.toFixed(1)} Z:{' '}
              {liveData.pos[2]?.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        camera={{ position: camPos, fov: 45, near: 0.1, far: 500 }}
        shadows
        gl={{ antialias: true }}
      >
        <CameraPositionReader onUpdate={setLiveData} />
        {freeLook && <FreeCameraController onFreeLook={freeLook} />}
        {showSky && <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={2} />}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-10, 5, -5]} intensity={0.4} />

        <SceneModel url={url} scale={scale} />

        {/* Интерактивные 3D Хотспоты */}
        {loadedHotspots.map((hs) => (
          <HotspotMarker3D key={hs.id} hotspot={hs} onInteract={setActiveInteraction} />
        ))}

        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.5}
          scale={100}
          blur={2}
          far={10}
          resolution={512}
          color="#000000"
        />

        {!freeLook && (
          <OrbitControls
            ref={orbitRef}
            target={camTarget}
            enablePan={true}
            enableZoom={enableZoom}
            minDistance={minDistance}
            maxDistance={maxDistance}
            enableDamping={true}
            dampingFactor={0.08}
          />
        )}
      </Canvas>

      {/* Модалка взаимодействия с хотспотом */}
      {activeInteraction && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 text-white shadow-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-emerald-400">
                Действие хотспота
              </span>
              <button onClick={() => setActiveInteraction(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="font-bold text-lg">{activeInteraction.title}</div>
            <div className="text-xs text-slate-400 font-mono">
              Действие: <span className="text-emerald-300 font-bold">{activeInteraction.action}</span>
            </div>
            <button
              onClick={() => setActiveInteraction(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* FreeLook instructions */}
      {freeLook && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 bg-amber-600/20 backdrop-blur-md rounded-xl border border-amber-400/30">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 text-center">
              Клик для захвата • WASD движение • Space вверх • Shift вниз • ESC выход
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
          <p className="text-[9px] font-black uppercase text-slate-300 tracking-wider text-center">
            {freeLook
              ? '🎮 Свободная камера • WASD + мышь • 📸 сохранить'
              : 'Drag вращение • Колёсико зум • Клик по хотспотам'}
          </p>
        </div>
      </div>
    </div>
  );
}
