// src/components/SceneViewer.jsx
// Полнофункциональный 3D Вьюпорт игрока (TG SAMP) с поддержкой хотспотов, 3D объектов и подлокаций
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  X,
  Sparkles,
  ArrowLeft,
  Compass,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { buildProceduralProp } from '../utils/proceduralProps.js';

const STORAGE_KEY = 'tgsamp_3d_hotspots_v1';

const COLOR_HEX_MAP = {
  emerald: 0x10b981,
  cyan: 0x06b6d4,
  amber: 0xf59e0b,
  rose: 0xf43f5e,
  violet: 0x8b5cf6,
  blue: 0x3b82f6,
  red: 0xef4444,
};

const COLOR_BG_CLASSES = {
  emerald: 'bg-emerald-500 text-slate-950 border-emerald-400',
  cyan: 'bg-cyan-500 text-slate-950 border-cyan-400',
  amber: 'bg-amber-500 text-slate-950 border-amber-400',
  rose: 'bg-rose-500 text-slate-950 border-rose-400',
  violet: 'bg-violet-500 text-white border-violet-400',
  blue: 'bg-blue-500 text-white border-blue-400',
  red: 'bg-red-500 text-white border-red-400',
};

const DEFAULT_CAMERA = {
  position: [15, 10, 15],
  target: [0, 2, 0],
  fov: 48,
};

export default function SceneViewer({
  url = '/models/myscene.glb',
  locationId = 'showroom_ls',
  onClose,
  onOpenEditor,
}) {
  const [currentLocId, setCurrentLocId] = useState(locationId);
  const [activeSubLocation, setActiveSubLocation] = useState(null); // { parentId, subName }
  const [activeModelUrl, setActiveModelUrl] = useState(url);
  const [cameraConfig, setCameraConfig] = useState(DEFAULT_CAMERA);
  const [hotspots, setHotspots] = useState([]);
  const [objects, setObjects] = useState([]);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const currentModelGroupRef = useRef(null);
  const hotspotsGroupRef = useRef(null);
  const objectsGroupRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const hotspotDomRefs = useRef(new Map());

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Вычисляемый идентификатор локации/подлокации
  const effectiveLocId = activeSubLocation
    ? `${activeSubLocation.parentId}__sub__${activeSubLocation.subName}`
    : currentLocId;

  // 1. Загрузка конфигурации локации из localStorage
  const loadSceneData = useCallback((locKey) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw);
        const saved = all[locKey];
        if (saved) {
          if (saved.modelUrl) setActiveModelUrl(saved.modelUrl);
          if (saved.camera) setCameraConfig(saved.camera);
          if (Array.isArray(saved.hotspots)) setHotspots(saved.hotspots);
          if (Array.isArray(saved.objects)) setObjects(saved.objects);
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not read saved scene data:', e);
    }
    // Дефолтная инициализация, если данных в localStorage нет
    setHotspots([
      {
        id: 'hs_default_enter',
        title: 'Вход в автосалон',
        action: 'enter',
        icon: 'door',
        color: 'emerald',
        position: [0, 0.7, 5],
        size: [1.2, 1.4, 1.2],
      },
    ]);
    setObjects([]);
    setCameraConfig(DEFAULT_CAMERA);
    return false;
  }, []);

  useEffect(() => {
    loadSceneData(effectiveLocId);
  }, [effectiveLocId, loadSceneData]);

  // 2. Инициализация Three.js
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(cameraConfig.fov || 48, width / height, 0.1, 800);
    const [px, py, pz] = cameraConfig.position || DEFAULT_CAMERA.position;
    camera.position.set(px, py, pz);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Освещение сцены
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.2);
    sunLight.position.set(25, 35, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 30;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const blueFill = new THREE.DirectionalLight(0x38bdf8, 0.4);
    blueFill.position.set(-20, 15, -20);
    scene.add(blueFill);

    // Контроллер OrbitControls с правильными ограничениями игрока
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    const [tx, ty, tz] = cameraConfig.target || DEFAULT_CAMERA.target;
    controls.target.set(tx, ty, tz);
    controls.enablePan = false; // Запрет панорамирования от локации
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Не уходить под землю
    controls.minDistance = 2;
    controls.maxDistance = 45;
    controlsRef.current = controls;

    // Группы
    const hotspotsGroup = new THREE.Group();
    scene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Анимационный цикл
    let animId;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Вращение кристаллов над чекпоинтами
      if (hotspotsGroupRef.current) {
        hotspotsGroupRef.current.children.forEach((wrapper) => {
          const diamond = wrapper.getObjectByName('diamond_crystal');
          if (diamond) {
            diamond.rotation.y += 0.02;
          }
        });
      }

      // Проекция 2D HTML бейджей
      if (hotspotsGroupRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        hotspotDomRefs.current.forEach((domEl, hsId) => {
          const obj = hotspotsGroupRef.current.children.find((c) => c.userData?.hotspotId === hsId);
          if (!obj) {
            domEl.style.display = 'none';
            return;
          }

          tempVec.set(obj.position.x, obj.position.y + 0.8, obj.position.z);
          tempVec.project(cameraRef.current);

          const isBehind = tempVec.z > 1;
          if (isBehind) {
            domEl.style.display = 'none';
          } else {
            domEl.style.display = 'flex';
            const screenX = ((tempVec.x + 1) * w) / 2;
            const screenY = ((-tempVec.y + 1) * h) / 2;
            const dist = cameraRef.current.position.distanceTo(obj.position);
            const scaleFactor = Math.max(0.65, Math.min(1.2, 25 / dist));
            domEl.style.transform = `translate(-50%, -100%) translate3d(${screenX}px, ${screenY}px, 0) scale(${scaleFactor})`;
          }
        });
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m.dispose());
          }
        });
      }
    };
  }, []);

  // 3. Синхронизация камеры при загрузке новых настроек
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const [px, py, pz] = cameraConfig.position || DEFAULT_CAMERA.position;
    const [tx, ty, tz] = cameraConfig.target || DEFAULT_CAMERA.target;

    cameraRef.current.position.set(px, py, pz);
    controlsRef.current.target.set(tx, ty, tz);
    if (cameraConfig.fov) {
      cameraRef.current.fov = cameraConfig.fov;
      cameraRef.current.updateProjectionMatrix();
    }
    controlsRef.current.update();
  }, [cameraConfig]);

  // 4. Загрузка GLB модели сцены
  useEffect(() => {
    if (!sceneRef.current) return;

    if (currentModelGroupRef.current) {
      sceneRef.current.remove(currentModelGroupRef.current);
      currentModelGroupRef.current = null;
    }

    setIsLoadingModel(true);
    const loader = new GLTFLoader();
    loader.load(
      activeModelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        sceneRef.current.add(model);
        currentModelGroupRef.current = model;
        setIsLoadingModel(false);
      },
      undefined,
      (err) => {
        console.warn('Could not load scene GLTF:', activeModelUrl, err);
        setIsLoadingModel(false);
      }
    );
  }, [activeModelUrl]);

  // 5. Создание визуальных чекпоинтов хотспотов
  useEffect(() => {
    if (!sceneRef.current || !hotspotsGroupRef.current) return;
    const group = hotspotsGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    hotspots.forEach((hs) => {
      const colHex = COLOR_HEX_MAP[hs.color] || 0x10b981;
      const hsWrapper = new THREE.Group();
      hsWrapper.position.set(hs.position[0], hs.position[1], hs.position[2]);
      hsWrapper.userData = { hotspotId: hs.id };

      const boxSize = hs.size || [1.2, 1.4, 1.2];

      // Напольное кольцо чекпоинта
      const ringGeo = new THREE.RingGeometry(0.5, 0.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colHex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = -boxSize[1] / 2 + 0.02;
      ringMesh.userData = { hotspotId: hs.id };
      hsWrapper.add(ringMesh);

      // Вращающийся кристалл над чекпоинтом
      const octGeo = new THREE.OctahedronGeometry(0.28, 0);
      const octMat = new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: colHex,
        emissiveIntensity: 0.65,
        metalness: 0.9,
        roughness: 0.15,
      });
      const diamond = new THREE.Mesh(octGeo, octMat);
      diamond.position.y = boxSize[1] / 2 + 0.3;
      diamond.name = 'diamond_crystal';
      diamond.userData = { hotspotId: hs.id };
      hsWrapper.add(diamond);

      group.add(hsWrapper);
    });
  }, [hotspots]);

  // 6. Отображение сохранённых 3D объектов (ATM, сейфы, пропсы)
  useEffect(() => {
    if (!sceneRef.current || !objectsGroupRef.current) return;
    const group = objectsGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    objects.forEach((obj) => {
      const propMesh = buildProceduralProp(obj.modelType);
      propMesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
      propMesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      propMesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
      propMesh.userData = { sceneObjectId: obj.id };

      propMesh.traverse((child) => {
        child.userData = { sceneObjectId: obj.id };
      });

      group.add(propMesh);
    });
  }, [objects]);

  // 7. Обработка клика по чекпоинтам и интерактивным объектам
  const handleCanvasClick = (e) => {
    if (!cameraRef.current || !canvasRef.current) return;

    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    if (dist > 12) return; // Пропуск драга камеры

    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);

    // Проверка клика по чекпоинту
    if (hotspotsGroupRef.current) {
      const hits = raycasterRef.current.intersectObjects(
        hotspotsGroupRef.current.children,
        true
      );
      if (hits.length > 0) {
        let cur = hits[0].object;
        let foundId = null;
        while (cur && cur !== hotspotsGroupRef.current) {
          if (cur.userData?.hotspotId) {
            foundId = cur.userData.hotspotId;
            break;
          }
          cur = cur.parent;
        }
        if (foundId) {
          const h = hotspots.find((item) => item.id === foundId);
          if (h) setActiveInteraction(h);
          return;
        }
      }
    }

    // Проверка клика по 3D объекту (если это интерактивный проп)
    if (objectsGroupRef.current) {
      const hits = raycasterRef.current.intersectObjects(
        objectsGroupRef.current.children,
        true
      );
      if (hits.length > 0) {
        let cur = hits[0].object;
        let foundObjId = null;
        while (cur && cur !== objectsGroupRef.current) {
          if (cur.userData?.sceneObjectId) {
            foundObjId = cur.userData.sceneObjectId;
            break;
          }
          cur = cur.parent;
        }
        if (foundObjId) {
          const o = objects.find((item) => item.id === foundObjId);
          if (o && o.isHotspot && o.hotspotConfig) {
            setActiveInteraction({
              id: o.id,
              title: o.hotspotConfig.title || o.name,
              action: o.hotspotConfig.action,
              icon: o.hotspotConfig.icon,
              subLocation: o.hotspotConfig.subLocation,
            });
          }
        }
      }
    }
  };

  // Сброс камеры к зафиксированной точке
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const [px, py, pz] = cameraConfig.position || DEFAULT_CAMERA.position;
    const [tx, ty, tz] = cameraConfig.target || DEFAULT_CAMERA.target;
    cameraRef.current.position.set(px, py, pz);
    controlsRef.current.target.set(tx, ty, tz);
    controlsRef.current.update();
    showToast('🎥 Ракурс камеры сброшен к исходному');
  };

  return (
    <div className="fixed inset-0 z-[100] w-full h-full bg-[#070b14] select-none flex flex-col overflow-hidden">
      {/* Верхний интерфейс игрока */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white backdrop-blur-md shadow-xl transition active:scale-95 flex items-center gap-1.5"
            >
              <ArrowLeft size={16} />
              <span className="text-xs font-bold hidden sm:inline">В игру</span>
            </button>
          )}

          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-slate-800 backdrop-blur-md shadow-xl flex items-center gap-2">
            <MapPin size={14} className="text-cyan-400 shrink-0" />
            <span className="text-xs font-bold text-white tracking-wide">
              {activeSubLocation ? activeSubLocation.subName : 'Автосалон / Экстерьер'}
            </span>
            {activeSubLocation && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                Интерьер
              </span>
            )}
          </div>

          {activeSubLocation && (
            <button
              onClick={() => {
                setActiveSubLocation(null);
                showToast('🚪 Вы вышли на улицу');
              }}
              className="px-3 py-2 rounded-2xl bg-cyan-600/90 hover:bg-cyan-500 border border-cyan-400/50 text-slate-950 font-black text-xs backdrop-blur-md shadow-lg transition active:scale-95 flex items-center gap-1"
            >
              ← Выйти на улицу
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            title="Сбросить ракурс камеры"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white backdrop-blur-md shadow-xl transition active:scale-95"
          >
            <Compass size={18} />
          </button>

          {onOpenEditor && (
            <button
              onClick={onOpenEditor}
              title="Открыть 3D редактор хотспотов"
              className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 text-slate-950 rounded-2xl font-black text-xs backdrop-blur-md shadow-xl transition active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles size={15} />
              <span className="hidden sm:inline">3D Редактор</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl backdrop-blur-md shadow-xl transition active:scale-95"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Тост уведомлений */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-4 py-2 bg-slate-900/90 border border-emerald-500/50 text-emerald-300 rounded-2xl text-xs font-bold backdrop-blur-md shadow-2xl">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Индикатор загрузки 3D модели */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-40 bg-[#070b14]/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="text-xs font-bold text-cyan-300 tracking-wider">Загрузка 3D локации...</div>
        </div>
      )}

      {/* Основной 3D холст */}
      <main ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-[#070b14]">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* 2D HTML бейджи над 3D чекпоинтами */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {hotspots.map((hs) => {
            const colClass = COLOR_BG_CLASSES[hs.color] || COLOR_BG_CLASSES.emerald;
            return (
              <div
                key={hs.id}
                ref={(el) => {
                  if (el) hotspotDomRefs.current.set(hs.id, el);
                  else hotspotDomRefs.current.delete(hs.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveInteraction(hs);
                }}
                className="absolute top-0 left-0 pointer-events-auto cursor-pointer transition-all duration-150 flex flex-col items-center hover:scale-110 active:scale-95"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-[0_8px_25px_rgba(0,0,0,0.7)] backdrop-blur-md text-white">
                  <span className={`w-2.5 h-2.5 rounded-full ${colClass.split(' ')[0]} shadow-sm`} />
                  <span className="font-black text-xs tracking-wide whitespace-nowrap">{hs.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {hs.action}
                  </span>
                </div>
                {/* Стрелочка указатель */}
                <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700 rotate-45 -mt-1" />
              </div>
            );
          })}
        </div>
      </main>

      {/* Нижняя подсказка для игрока */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-5 py-2.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/80 text-center shadow-2xl">
          <p className="text-[11px] font-bold text-slate-300">
            🖱️ Драг для осмотра • 🎯 Клик по чекпоинту для действия
          </p>
        </div>
      </footer>

      {/* Модальное окно взаимодействия с хотспотом (GTA SA-MP Диалог) */}
      {activeInteraction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 text-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  {activeInteraction.title}
                </span>
              </div>
              <button
                onClick={() => setActiveInteraction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="text-sm font-bold text-slate-100">
                Действие: <span className="text-emerald-400 uppercase font-mono">{activeInteraction.action}</span>
              </div>
              {activeInteraction.subLocation && (
                <div className="text-xs text-cyan-300 flex items-center gap-1.5 font-medium">
                  <Layers size={13} />
                  <span>Переход в подлокацию: <b>{activeInteraction.subLocation}</b></span>
                </div>
              )}
              <div className="text-xs text-slate-400 leading-relaxed">
                Вы находитесь возле интерактивной точки. Выберите действие для выполнения на сервере.
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {activeInteraction.subLocation ? (
                <button
                  onClick={() => {
                    setActiveSubLocation({
                      parentId: currentLocId,
                      subName: activeInteraction.subLocation,
                    });
                    setActiveInteraction(null);
                    showToast(`🚀 Переход в ${activeInteraction.subLocation}...`);
                  }}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>Войти в {activeInteraction.subLocation}</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    showToast(`✅ Действие "${activeInteraction.title}" выполнено!`);
                    setActiveInteraction(null);
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  Взаимодействовать
                </button>
              )}

              <button
                onClick={() => setActiveInteraction(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xs text-slate-300 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
