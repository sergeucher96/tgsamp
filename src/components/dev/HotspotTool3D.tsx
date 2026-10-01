// src/components/dev/HotspotTool3D.tsx
// Полнофункциональный 3D Редактор Хотспотов и Объектов для TG SAMP
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ArrowLeft,
  X,
  Save,
  Download,
  Upload,
  Copy,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Box,
  Crosshair,
  Sliders,
  Move,
  RotateCw,
  Compass,
  ArrowDown,
  Sparkles,
  Eye,
  Check,
  RefreshCw,
  Layers,
  Settings2,
  Smartphone,
  Info,
  Grid,
  ChevronRight,
  FolderPlus,
  Flame,
  Key,
  Shield,
  ShoppingBag,
  Wrench,
  DollarSign,
  Car,
  Home,
  User,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { LOCATIONS } from '../../game/locations/locations';
import {
  getInteriorMode,
  hasScene3D,
  setInteriorMode,
  type InteriorMode,
} from '../../game/locations/scene3d';
import { LOCATION_ACTIONS, getActionsForCategory, getLocationCategory } from '../../features/businesses/data/locationActions';
import { PROP_PRESET_OPTIONS, buildProceduralProp } from '../../game/rendering/proceduralProps';
// Камера: опорный кадр и движение игрока. Типы и значения по
// умолчанию живут в sceneCamera, общие с игрой: раньше редактор
// объявлял свои структуры, а игра читала только position/target/fov,
// из-за чего параллакс из редактора до игроков не доходил.
import {
  DEFAULT_CAMERA,
  withCameraDefaults,
  fitCameraForAspect,
  isMobileAspect,
  fitsFocusOnScreen,
  REFERENCE_ASPECT,
  PHONE_ASPECT,
  type CameraConfig,
  type ParallaxProfile,
} from '../../game/locations/sceneCamera';

// Иконки хотспотов
export const HOTSPOT_ICONS = [
  { id: 'door', label: 'Дверь / Вход', icon: Key },
  { id: 'dollar', label: 'Деньги / Касса', icon: DollarSign },
  { id: 'cart', label: 'Магазин / Покупка', icon: ShoppingBag },
  { id: 'car', label: 'Транспорт / Гараж', icon: Car },
  { id: 'home', label: 'Дом / Квартира', icon: Home },
  { id: 'wrench', label: 'Тюнинг / Ремонт', icon: Wrench },
  { id: 'box', label: 'Склад / Ящик', icon: Box },
  { id: 'shield', label: 'Организация / Охрана', icon: Shield },
  { id: 'sparkles', label: 'Особое / Квест', icon: Sparkles },
  { id: 'flame', label: 'Опасно / Банда', icon: Flame },
  { id: 'info', label: 'Информация', icon: Info },
  { id: 'user', label: 'Персонаж / NPC', icon: User },
];

// Цвета хотспотов
export const HOTSPOT_COLORS = [
  { id: 'emerald', label: 'Изумрудный', hex: 0x10b981, bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { id: 'cyan', label: 'Бирюзовый', hex: 0x06b6d4, bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { id: 'amber', label: 'Янтарный', hex: 0xf59e0b, bg: 'bg-amber-500', border: 'border-amber-500' },
  { id: 'rose', label: 'Розовый', hex: 0xf43f5e, bg: 'bg-rose-500', border: 'border-rose-500' },
  { id: 'violet', label: 'Фиолетовый', hex: 0x8b5cf6, bg: 'bg-violet-500', border: 'border-violet-500' },
  { id: 'blue', label: 'Синий', hex: 0x3b82f6, bg: 'bg-blue-500', border: 'border-blue-500' },
  { id: 'red', label: 'Красный', hex: 0xef4444, bg: 'bg-red-500', border: 'border-red-500' },
];

const COLOR_HEX_MAP = {
  emerald: 0x10b981,
  cyan: 0x06b6d4,
  amber: 0xf59e0b,
  rose: 0xf43f5e,
  violet: 0x8b5cf6,
  blue: 0x3b82f6,
  red: 0xef4444,
};

const STORAGE_KEY = 'tgsamp_3d_hotspots_v1';
const DEFAULT_MODEL_URL = '/models/myscene.glb';
const CUSTOM_SCENE_MODEL_URL = 'custom_scene_model';

/**
 * Интерьер без модели сцены: видны только сетка и расставленные объекты.
 *
 * Отдельное значение вместо прежнего 'procedural'. Тот вариант не
 * проходил normalizeModelUrl и молча превращался в модель по
 * умолчанию — выбирали «без модели» и получали автосалон. К тому же
 * 'procedural' ничего не говорил о том, что сцены действительно нет.
 */
const NO_SCENE_MODEL = 'none';

// Пресеты моделей сцен
const SCENE_MODEL_PRESETS = [
  { id: 'myscene', name: '🏙️ Экстерьер (myscene.glb)', url: DEFAULT_MODEL_URL },
  { id: 'none', name: '🌐 Без модели (только сетка и объекты)', url: NO_SCENE_MODEL },
];

const PRESET_MODEL_URLS = new Set(SCENE_MODEL_PRESETS.map((preset) => preset.url));

// Бинарные модели сцен и объектов живут в IndexedDB — общий модуль
// с игрой, иначе игра не найдёт модель, загруженную здесь.
import {
  saveBufferToDB,
  loadBufferFromDB,
  deleteBufferFromDB,
  sceneModelKey,
  CUSTOM_OBJECT_PREFIX,
} from '../../game/locations/sceneModels';

const normalizeModelUrl = (url) => {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // «Без модели» — полноценный выбор, его нельзя отбрасывать
  // вместе с мусором, иначе интерьер получит модель по умолчанию.
  if (trimmed === NO_SCENE_MODEL) return NO_SCENE_MODEL;

  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl === CUSTOM_SCENE_MODEL_URL ||
    lowerUrl.startsWith('blob:') ||
    lowerUrl.startsWith('file:')
  ) {
    return null;
  }

  const presetByIdOrUrl = SCENE_MODEL_PRESETS.find(
    (preset) => preset.id === trimmed || preset.url === trimmed
  );
  if (presetByIdOrUrl) return presetByIdOrUrl.url;

  const cleanPath = trimmed.split(/[?#]/)[0].replace(/\\/g, '/');
  const fileName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1).toLowerCase();
  const presetByFileName = SCENE_MODEL_PRESETS.find((preset) => {
    const presetFileName = preset.url.split(/[?#]/)[0].split('/').pop().toLowerCase();
    return presetFileName === fileName;
  });
  if (presetByFileName) return presetByFileName.url;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/models\/.+\.(glb|gltf)$/i.test(cleanPath)) return trimmed;

  return null;
};
const isRestorableModelUrl = (url) => normalizeModelUrl(url) !== null;

// Safe localStorage set (как в 2D редакторе)
const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
};

interface HotspotTool3DProps { onClose?: () => void; }

export default function HotspotTool3D({ onClose }: HotspotTool3DProps) {
  // Выбор локации и подлокации
  const [selectedLocId, setSelectedLocId] = useState('showroom_ls');
  const [editingSubLocation, setEditingSubLocation] = useState(null); // { parentId, subName }
  const [activeModelUrl, setActiveModelUrl] = useState(NO_SCENE_MODEL);
  const [customSceneModel, setCustomSceneModel] = useState(null);

  // Режим редактора: 'editor' | 'player'
  const [mode, setMode] = useState('editor');
  const [activeTab, setActiveTab] = useState('hotspots'); // 'hotspots' | 'objects' | 'camera'

  // Режимы расстановки
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [isObjectPlacementMode, setIsObjectPlacementMode] = useState(false);
  const [pendingObjectType, setPendingObjectType] = useState('atm_machine');

  // Хотспоты и 3D объекты
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

/**
 * Поставить камеру в опорный кадр и повернуть по указателю.
 *
 * Считает ровно то же, что и SceneViewer в игре: та же подгонка под
 * соотношение сторон, тот же отъезд на узких экранах и тот же
 * профиль движения. Общая формула — единственный способ увидеть в
 * редакторе настоящую картинку игрока.
 *
 * `aspect` — соотношение сторон устройства, по которому считается
 * кадр. `viewportAspect` — реальное соотношение сторон области
 * отрисовки; в двойном превью они различаются, потому что телефон
 * показан в широкой половине окна.
 */
function applyPreviewFrame(
  camera: any,
  config: CameraConfig,
  aspect: number,
  px: number,
  py: number,
  viewportAspect = aspect
) {
  const fitted = fitCameraForAspect(config, aspect);
  const profile = isMobileAspect(aspect) ? config.motion.mobile : config.motion.desktop;

  const target = config.target;
  const base = config.position;
  const basePos = new THREE.Vector3(
    target[0] + (base[0] - target[0]) * fitted.distanceScale,
    target[1] + (base[1] - target[1]) * fitted.distanceScale,
    target[2] + (base[2] - target[2]) * fitted.distanceScale
  );

  if (camera.fov !== fitted.fov) {
    camera.fov = fitted.fov;
    camera.updateProjectionMatrix();
  }
  if (camera.aspect !== viewportAspect) {
    camera.aspect = viewportAspect;
    camera.updateProjectionMatrix();
  }

  const look = new THREE.Object3D();
  look.position.copy(basePos);
  look.up.set(0, 1, 0);
  look.lookAt(target[0], target[1], target[2]);

  if (!profile.enabled) {
    camera.position.copy(basePos);
    camera.quaternion.copy(look.quaternion);
    return;
  }

  const yaw = ((profile.yawDegrees * Math.PI) / 180) * -px;
  const pitch = ((profile.pitchDegrees * Math.PI) / 180) * py;
  const roll = -px * 0.015;

  const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
  const delta = new THREE.Quaternion().setFromEuler(euler);
  const targetQuat = look.quaternion.clone().multiply(delta);

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(look.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(look.quaternion);
  const desired = basePos
    .clone()
    .addScaledVector(right, px * profile.positionShift)
    .addScaledVector(up, py * profile.positionShift * 0.5);

  const smooth = Math.max(0.01, Math.min(1, profile.smoothness));
  camera.position.lerp(desired, smooth);
  camera.quaternion.slerp(targetQuat, smooth);
}

/**
 * Строка проверки: помещается ли обязательный круг в кадр на этом
 * экране. Показываем это автору сразу, иначе неудачный кадр
 * обнаружится только у игроков.
 */
function FocusCheckRow({
  aspect,
  label,
  config,
}: {
  aspect: number;
  label: string;
  config: CameraConfig;
}) {
  const fits = fitsFocusOnScreen(config, aspect);
  const fitted = fitCameraForAspect(config, aspect);
  return (
    <div
      className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg border ${
        fits
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
      }`}
    >
      <span className="font-bold">{label}</span>
      <span className="font-mono">
        {fits
          ? `помещается · FOV ${Math.round(fitted.fov)}°${fitted.distanceScale > 1 ? ` · отход ×${fitted.distanceScale.toFixed(2)}` : ''}`
          : 'не помещается — уменьшите радиус или отъедьте камеру'}
      </span>
    </div>
  );
}

// Камера и настройки
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(DEFAULT_CAMERA);
  // Какой из двух профилей движения правится сейчас. В игре выбор
  // профиля делается по соотношению сторон экрана автоматически.
  const [editingDevice, setEditingDevice] = useState<'desktop' | 'mobile'>('desktop');

  const editingProfile: ParallaxProfile = cameraConfig.motion[editingDevice];

  const updateProfile = (patch: Partial<ParallaxProfile>) => {
    setCameraConfig((prev) => ({
      ...prev,
      motion: {
        ...prev.motion,
        [editingDevice]: { ...prev.motion[editingDevice], ...patch },
      },
    }));
  };
  const [showGrid, setShowGrid] = useState(true);
  const [showFocusCircle, setShowFocusCircle] = useState(true);
  const [comparePreview, setComparePreview] = useState(false);
  const comparePreviewRef = useRef(false);
  comparePreviewRef.current = comparePreview;
  const [showCameraView, setShowCameraView] = useState(false);
  const [liveAngleOffset, setLiveAngleOffset] = useState({ yaw: 0, pitch: 0 });

  // Transform Controls
  const [transformMode, setTransformMode] = useState('translate'); // 'translate' | 'rotate' | 'scale'
  const [snapGrid, setSnapGrid] = useState(false);
  const [snapStep, setSnapStep] = useState(0.25);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);
  const [liveTransformInfo, setLiveTransformInfo] = useState(null);

  // UI Состояния
  const [showTwaFrame, setShowTwaFrame] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [customActionsMap, setCustomActionsMap] = useState({});
  const [isManagingActions, setIsManagingActions] = useState(false);
  const [newActionCode, setNewActionCode] = useState('');
  const [newActionLabel, setNewActionLabel] = useState('');
  const [interactedHotspot, setInteractedHotspot] = useState(null);

  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const currentModelGroupRef = useRef(null);
  const hotspotsGroupRef = useRef(null);
  const objectsGroupRef = useRef(null);
  const ghostMarkerRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });
  const modeRef = useRef(mode);
  const cameraConfigRef = useRef(cameraConfig);
  const isGizmoDraggingRef = useRef(false);
  const gridRef = useRef(null);
  const focusGroupRef = useRef(null);
  const phoneCameraRef = useRef(null);
  // Ссылки на объекты сцены для цикла кадра: поиск по группе
  // перебором давал квадрат на каждом кадре анимации.
  const hotspotObjectMapRef = useRef(new Map());
  const diamondSpinListRef = useRef([]);
  const cameraHelperRef = useRef(null);
  const dummyCameraRef = useRef(null);

  // DOM badge elements ref map
  const hotspotDomRefs = useRef(new Map());
  const objectDomRefs = useRef(new Map());
  
  // In-memory cache for custom object buffers (since we can't read them from localStorage)
  const objectBuffersCache = useRef(new Map());

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Эффективный ID локации (с учётом подлокации)
  const effectiveLocId = useMemo(() => {
    if (editingSubLocation) {
      return `${editingSubLocation.parentId}__${editingSubLocation.subName}`;
    }
    return selectedLocId;
  }, [selectedLocId, editingSubLocation]);

  // Категория локации для списка действий
  const currentCategory = useMemo(() => {
    return getLocationCategory(selectedLocId) || 'house';
  }, [selectedLocId]);

  // Переключатель интерьера 2D/3D. Подлокация — самостоятельная
  // локация со своим интерьером, поэтому переключатель привязан к
  // эффективному ключу, а не к родителю: у туалета бара свой выбор.
  const [interiorMode, setInteriorModeState] = useState<InteriorMode | 'auto'>('auto');

  useEffect(() => {
    setInteriorModeState(getInteriorMode(effectiveLocId));
  }, [effectiveLocId]);

  const applyInteriorMode = (next: InteriorMode | 'auto') => {
    setInteriorModeState(next);
    setInteriorMode(effectiveLocId, next);
    showToast(next === 'auto' ? 'Авто' : next === '3d' ? '✅ Интерьер будет 3D' : '✅ Интерьер будет 2D');
  };

  // Доступные действия
  const availableActions = useMemo(() => {
    const base = getActionsForCategory(currentCategory) || [];
    const custom = customActionsMap[effectiveLocId] || [];
    return [...base, ...custom];
  }, [currentCategory, customActionsMap, effectiveLocId]);

  // Выбранный объект и хотспот
  const selectedObject = useMemo(() => {
    return objects.find((o) => o.id === selectedObjectId) || null;
  }, [objects, selectedObjectId]);

  const selectedHotspot = useMemo(() => {
    return hotspots.find((h) => h.id === selectedHotspotId) || null;
  }, [hotspots, selectedHotspotId, mode]);

  modeRef.current = mode;
  cameraConfigRef.current = cameraConfig;
  isGizmoDraggingRef.current = isGizmoDragging;

  // =========================================================
  // 1. ЗАГРУЗКА И СОХРАНЕНИЕ ДАННЫХ ЛОКАЦИИ (LocalStorage / JSON)
  // =========================================================

  const loadLocationData = useCallback(async (locKey) => {
    // 1. Пытаемся загрузить 3D данные
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const allData = JSON.parse(raw);
        const locData = allData[locKey];
        if (locData) {
          if (locData.hotspots) setHotspots(locData.hotspots);
          
          // Загружаем объекты и восстанавливаем modelBuffer из IndexedDB
          const loadedObjects = locData.objects || [];
          for (const obj of loadedObjects) {
            if (obj.modelType === 'custom_glb') {
              // Try cache first, then IndexedDB
              const cached = objectBuffersCache.current.get(obj.id);
              if (cached) {
                obj.modelBuffer = cached;
              } else {
                obj.modelBuffer = await loadBufferFromDB(`${CUSTOM_OBJECT_PREFIX}${obj.id}`);
                if (obj.modelBuffer) {
                  objectBuffersCache.current.set(obj.id, obj.modelBuffer);
                  console.log(`[3D Hotspot] Восстановлен buffer для объекта ${obj.name}`);
                }
              }
            }
          }
          setObjects(loadedObjects);
          
          if (locData.camera) setCameraConfig(withCameraDefaults(locData.camera));
          const savedModelUrl = normalizeModelUrl(locData.modelUrl);
          // Нет сохранённой модели — значит автор её не выбирал. Раньше
          // здесь подставлялся экстерьер по умолчанию, и каждая
          // локация, которую открыли в редакторе, получала чужую сцену.
          setActiveModelUrl(savedModelUrl || NO_SCENE_MODEL);
          console.log('[3D Hotspot] Загружены 3D данные для', locKey);
          
          // Кастомная модель сцены. Ключ включает локацию: раньше был
          // один общий буфер, и шахта подхватывала модель автосалона.
          if (locData.customModelName) {
            const sceneBuffer = await loadBufferFromDB(sceneModelKey(locKey));
            if (sceneBuffer) {
              console.log('[3D Hotspot] Восстановлен buffer модели сцены:', locData.customModelName);
              setCustomSceneModel({ name: locData.customModelName, buffer: sceneBuffer });
              setActiveModelUrl(CUSTOM_SCENE_MODEL_URL);
            } else {
              console.warn('[3D Hotspot] Модель', locData.customModelName, 'потеряна: буфера нет в IndexedDB');
            }
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error loading 3D hotspots:', e);
    }

    // 2D-интерьер сюда намеренно не подтягивается. Раньше зоны из
    // 2D молча конвертировались в 3D: координаты в процентах
    // превращались в позиции по формуле, и результат выглядел как
    // расставленные автором зоны, хотя их никто не ставил. Теперь
    // интерьер либо 3D, либо 2D — по переключателю.
    return false;
  }, []);

  const saveLocationData = useCallback(async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const allData = raw ? JSON.parse(raw) : {};

      const savedModelUrl = normalizeModelUrl(activeModelUrl) || NO_SCENE_MODEL;

      allData[effectiveLocId] = {
        // Запись пересобирается целиком, поэтому interiorMode из неё надо
        // перенести: иначе автосохранение сбрасывало бы переключатель 2D/3D.
        ...(allData[effectiveLocId] || {}),
        modelUrl: savedModelUrl,
        customModelName: activeModelUrl === CUSTOM_SCENE_MODEL_URL ? customSceneModel?.name : undefined,
        camera: cameraConfig,
        hotspots,
        objects,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

      // Сцену сохраняем на диск отдельным файлом. Раньше она писалась
      // в hotspot_tool_* и savedHotspots.json — общие с 2D-редактором
      // ключи, где лежат картинка и хотспоты в процентах. Запись
      // сцены затирала 2D-интерьер, а наоборот — 2D затирал сцену.
      const scenePayload = {
        modelUrl: savedModelUrl,
        ...(activeModelUrl === CUSTOM_SCENE_MODEL_URL && customSceneModel?.name
          ? { customModelName: customSceneModel.name }
          : {}),
        camera: cameraConfig,
        hotspots,
        objects,
        updatedAt: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/save-3d-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: effectiveLocId, payload: scenePayload }),
        });
        if (res.ok) {
          showToast('💾 Сцена сохранена на диск в savedScenes3D.json!');
          return true;
        }
      } catch (e) {
        // API недоступен (например, на проде) — сохраняем только в localStorage
      }

      showToast('✅ Сцена сохранена в браузере (localStorage)');
      return true;
    } catch (e) {
      console.error(e);
      showToast('⚠️ Ошибка сохранения данных!');
      return false;
    }
  }, [effectiveLocId, selectedLocId, editingSubLocation, activeModelUrl, customSceneModel, cameraConfig, hotspots, objects]);

  // При смене локации загружаем её данные
  useEffect(() => {
    (async () => {
      const loaded = await loadLocationData(effectiveLocId);
      if (!loaded) {
        // Сброс до начального состояния, если данных ещё нет
        setHotspots([]);
        setObjects([]);
        setSelectedHotspotId(null);
        setSelectedObjectId(null);
        // Новой локации показываем модель по умолчанию. Подставлять
        // тут чужой буфер нельзя: локация без своих данных получила
        // бы сцену, нарисованную для другой, и правки сохранялись бы
        // уже поверх неё.
        setCustomSceneModel(null);
        setActiveModelUrl(NO_SCENE_MODEL);
      }
    })();
  }, [effectiveLocId, loadLocationData]);

  // =========================================================
  // АВТОСОХРАНЕНИЕ в localStorage при изменениях (debounce)
  // =========================================================
  const autoSaveTimerRef = useRef(null);
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const allData = raw ? JSON.parse(raw) : {};
        const savedModelUrl = normalizeModelUrl(activeModelUrl) || NO_SCENE_MODEL;
      allData[effectiveLocId] = {
        ...(allData[effectiveLocId] || {}),
        modelUrl: savedModelUrl,
        customModelName: activeModelUrl === CUSTOM_SCENE_MODEL_URL ? customSceneModel?.name : undefined,
        camera: cameraConfig,
        hotspots,
        objects,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      } catch (e) {
        console.error('[3D Hotspot] Autosave error:', e);
      }
    }, 2000); // 2秒 debounce
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [effectiveLocId, activeModelUrl, customSceneModel, cameraConfig, hotspots, objects]);

  // =========================================================
  // 2. ИНИЦИАЛИЗАЦИЯ THREE.JS СЦЕНЫ
  // =========================================================

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    // Камера
    const camera = new THREE.PerspectiveCamera(cameraConfig.fov || 48, width / height, 0.1, 800);
    camera.position.set(cameraConfig.position[0], cameraConfig.position[1], cameraConfig.position[2]);
    cameraRef.current = camera;

    // Вторая камера нужна только для двойного превью: показывает
    // ту же сцену с узким экраном, в соседнем вьюпорте.
    const phoneCamera = new THREE.PerspectiveCamera(cameraConfig.fov || 48, PHONE_ASPECT, 0.1, 800);
    phoneCameraRef.current = phoneCamera;

    // Камера joueur (для visualizer области видимости)
    const dummyCam = new THREE.PerspectiveCamera(
      cameraConfig.fov || 48,
      9 / 16, // rapporto schermo giocatore (si pone come TAwphone)
      1, 200
    );
    dummyCam.position.set(
      cameraConfig.position[0],
      cameraConfig.position[1],
      cameraConfig.position[2]
    );
    dummyCam.up.set(0, 1, 0);
    dummyCam.lookAt(
      cameraConfig.target[0],
      cameraConfig.target[1],
      cameraConfig.target[2]
    );
    dummyCameraRef.current = dummyCam;
    scene.add(dummyCam);

    // Рендерер
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

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff7ed, 1.2);
    dirLight1.position.set(25, 35, 20);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 150;
    const d = 30;
    dirLight1.shadow.camera.left = -d;
    dirLight1.shadow.camera.right = d;
    dirLight1.shadow.camera.top = d;
    dirLight1.shadow.camera.bottom = -d;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.4);
    dirLight2.position.set(-20, 15, -20);
    scene.add(dirLight2);

    // Сетка полигона
    const grid = new THREE.GridHelper(30, 30, 0x10b981, 0x1e293b);
    grid.position.y = -0.01;
    grid.visible = mode === 'editor';
    scene.add(grid);
    gridRef.current = grid;

    // Круг обязательной видимости вокруг цели: что игрок обязан
    // увидеть сразу, не двигая камеру. Раньше про этот радиус
    // сообщал только текст в панели, а в самой сцене не было видно,
    // вписывается ли важный объект.
    const focusGroup = new THREE.Group();
    const focusFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      })
    );
    focusFill.rotation.x = -Math.PI / 2;
    const focusRing = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2, false, 0).getPoints(64).map((p) =>
          new THREE.Vector3(p.x, 0, p.y)
        )
      ),
      new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85 })
    );
    focusGroup.add(focusFill, focusRing);
    focusGroup.visible = mode === 'editor';
    scene.add(focusGroup);
    focusGroupRef.current = focusGroup;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(cameraConfig.target[0], cameraConfig.target[1], cameraConfig.target[2]);
    controlsRef.current = controls;

    // Группы объектов
    const hotspotsGroup = new THREE.Group();
    scene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;

    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Призрак для размещения
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    const ghostGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
    const ghostEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostGeo),
      new THREE.LineBasicMaterial({ color: 0x34d399 })
    );
    ghostGroup.add(ghostEdges);
    const ghostFill = new THREE.Mesh(
      ghostGeo,
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    ghostGroup.add(ghostFill);
    scene.add(ghostGroup);
    ghostMarkerRef.current = ghostGroup;

    // TransformControls
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.9;
    transformControls.space = 'world';
    const helper = transformControls.getHelper();
    helper.visible = false;
    scene.add(helper);
    transformControlsRef.current = transformControls;

    transformControls.addEventListener('dragging-changed', (e) => {
      const isDragging = !!e.value;
      isGizmoDraggingRef.current = isDragging;
      setIsGizmoDragging(isDragging);
      if (controlsRef.current) {
        controlsRef.current.enabled = !isDragging;
      }
    });

    transformControls.addEventListener('objectChange', () => {
      if (!transformControls.object) return;
      const obj3d = transformControls.object;
      const objId = obj3d.userData?.sceneObjectId;
      if (!objId) return;

      const px = Number(obj3d.position.x.toFixed(2));
      const py = Number(obj3d.position.y.toFixed(2));
      const pz = Number(obj3d.position.z.toFixed(2));

      const rx = Number(((obj3d.rotation.x * 180) / Math.PI).toFixed(1));
      const ry = Number(((obj3d.rotation.y * 180) / Math.PI).toFixed(1));
      const rz = Number(((obj3d.rotation.z * 180) / Math.PI).toFixed(1));

      const sx = Number(obj3d.scale.x.toFixed(2));
      const sy = Number(obj3d.scale.y.toFixed(2));
      const sz = Number(obj3d.scale.z.toFixed(2));

      setLiveTransformInfo({
        id: objId,
        position: [px, py, pz],
        rotation: [rx, ry, rz],
        scale: [sx, sy, sz],
      });
    });

    transformControls.addEventListener('mouseUp', () => {
      if (!transformControls.object) return;
      const obj3d = transformControls.object;
      const objId = obj3d.userData?.sceneObjectId;
      if (!objId) return;

      const px = Number(obj3d.position.x.toFixed(2));
      const py = Number(obj3d.position.y.toFixed(2));
      const pz = Number(obj3d.position.z.toFixed(2));

      const rx = Number(((obj3d.rotation.x * 180) / Math.PI).toFixed(1));
      const ry = Number(((obj3d.rotation.y * 180) / Math.PI).toFixed(1));
      const rz = Number(((obj3d.rotation.z * 180) / Math.PI).toFixed(1));

      const sx = Number(obj3d.scale.x.toFixed(2));
      const sy = Number(obj3d.scale.y.toFixed(2));
      const sz = Number(obj3d.scale.z.toFixed(2));

      setObjects((prev) =>
        prev.map((item) =>
          item.id === objId
            ? { ...item, position: [px, py, pz], rotation: [rx, ry, rz], scale: [sx, sy, sz] }
            : item
        )
      );
      setLiveTransformInfo(null);
    });

    // Расчёт кадра предпросмотра вынесен в applyPreviewFrame, ему
    // нужны собственные векторы на каждый вызов.

    // Анимационный цикл
    let animId;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
      // Скрытая вкладка: сцену никто не видит, а рендер идёт.
      if (document.hidden) return;

      const currentMode = modeRef.current;
      const currentCameraConfig = cameraConfigRef.current;

      if (currentMode === 'player') {
        if (controlsRef.current) controlsRef.current.enabled = false;
        if (!comparePreviewRef.current) {
          // Предпросмотр считается ровно так же, как в игре: та же
          // подгонка под соотношение сторон и тот же профиль движения.
          // Раньше здесь крутились собственные ручки редактора, и
          // предпросмотр показывал не то, что увидит игрок.
          const aspect = containerRef.current
            ? containerRef.current.clientWidth / containerRef.current.clientHeight
            : 16 / 9;

          applyPreviewFrame(
            cameraRef.current,
            currentCameraConfig,
            aspect,
            pointerRef.current.x,
            pointerRef.current.y
          );
        }
      } else if (!isGizmoDraggingRef.current && controlsRef.current) {
        controls.enabled = true;
        controls.update();
      }
      if (hotspotsGroupRef.current) {
        // Кристаллы вращаем по сохранённым ссылкам: поиск по имени
        // внутри цикла кадра обходил всё дерево хотспота 60 раз
        // в секунду.
        diamondSpinListRef.current.forEach((diamond) => {
          diamond.rotation.y += 0.02;
        });
      }

      // Обновление экранных координат 2D бейджей хотспотов
      if (hotspotsGroupRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        hotspotDomRefs.current.forEach((domEl, hsId) => {
          const obj = hotspotObjectMapRef.current.get(hsId);
          if (!obj) {
            domEl.style.display = 'none';
            return;
          }

          tempVec.set(obj.position.x, obj.position.y + 0.8, obj.position.z);
          tempVec.project(cameraRef.current);

          const isBehind = tempVec.z > 1;
          if (isBehind || comparePreviewRef.current) {
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

      if (currentMode === 'player' && comparePreviewRef.current && phoneCameraRef.current) {
        // Двойное превью: слева кадр на ПК, справа на телефоне.
        // Один и тот же кадр рисуется дважды с разными камерами,
        // поэтому сравнение честное — обе половины считаются по
        // той же формуле, что и настоящая игра.
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;

        const r = rendererRef.current;
        const gap = 2;
        const halfW = Math.floor((w - gap) / 2);
        const paneAspect = halfW / h;
        r.setScissorTest(true);

        applyPreviewFrame(cameraRef.current, currentCameraConfig, REFERENCE_ASPECT, px, py, paneAspect);
        applyPreviewFrame(phoneCameraRef.current, currentCameraConfig, PHONE_ASPECT, px, py, paneAspect);

        // Левая половина — ПК.
        r.setViewport(0, 0, halfW, h);
        r.setScissor(0, 0, halfW, h);
        r.render(sceneRef.current, cameraRef.current);

        // Правая половина — телефон.
        r.setViewport(halfW + gap, 0, halfW, h);
        r.setScissor(halfW + gap, 0, halfW, h);
        r.render(sceneRef.current, phoneCameraRef.current);

        r.setScissorTest(false);
        r.setViewport(0, 0, w, h);
        return;
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
      transformControls.dispose();
      controls.dispose();
      renderer.dispose();

      // Clean up camera helper
      if (cameraHelperRef.current) {
        scene.remove(cameraHelperRef.current);
        cameraHelperRef.current = null;
      }
      if (dummyCameraRef.current) {
        scene.remove(dummyCameraRef.current);
        dummyCameraRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          }
        });
        sceneRef.current = null;
      }
    };
  }, []);

  // =========================================================
  // 3. ЗАГРУЗКА 3D МОДЕЛИ СЦЕНЫ
  // =========================================================

  useEffect(() => {
    if (!sceneRef.current) return undefined;

    let cancelled = false;

    if (currentModelGroupRef.current) {
      const previousModel = currentModelGroupRef.current;
      sceneRef.current.remove(previousModel);
      previousModel.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            Object.keys(material)
              .map((key) => material[key])
              .filter((value) => value?.isTexture)
              .forEach((texture) => texture.dispose());
            material.dispose();
          });
        }
      });
      currentModelGroupRef.current = null;
    }

    const isCustomModel = activeModelUrl === CUSTOM_SCENE_MODEL_URL;
    const isNoModel = activeModelUrl === NO_SCENE_MODEL;

    // Без модели сцены загружать нечего: остаются сетка и объекты.
    if (isNoModel) {
      showToast('🌐 Интерьер без модели сцены');
      return () => {
        cancelled = true;
      };
    }

    const modelUrl = isCustomModel
      ? CUSTOM_SCENE_MODEL_URL
      : normalizeModelUrl(activeModelUrl) || NO_SCENE_MODEL;

    if (isCustomModel && !customSceneModel?.buffer) {
      return () => {
        cancelled = true;
      };
    }

    const loader = new GLTFLoader();
    
    // Progress callback для отладки больших моделей
    const onLoadProgress = (xhr) => {
      if (xhr.total > 0) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        console.log(`[3D Scene Model] Загрузка модели ${modelUrl}: ${percent}% (${(xhr.loaded / 1024 / 1024).toFixed(1)}MB / ${(xhr.total / 1024 / 1024).toFixed(1)}MB)`);
      }
    };

    const addModel = (result) => {
      if (cancelled || !sceneRef.current) return;

      // GLTFLoader.load может вернуть Scene или GLTF объект
      let model;
      if (result.scene) {
        // GLTF result
        model = result.scene;
      } else if (result.isGroup || result.isObject3D) {
        // Scene напрямую
        model = result;
      } else {
        handleError(new Error('Невозможно определить тип загруженного объекта'));
        return;
      }

      console.log('[3D Scene Model] Модель успешно загружена:', modelUrl);
      model.name = isCustomModel ? (customSceneModel?.name || 'custom') : modelUrl;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      if (isCustomModel) {
        const bbox = new THREE.Box3().setFromObject(model);
        if (!bbox.isEmpty() && Number.isFinite(bbox.min.x) && Number.isFinite(bbox.min.y) && Number.isFinite(bbox.min.z)) {
          const center = bbox.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.y -= bbox.min.y;
          model.position.z -= center.z;
        }
      }

      sceneRef.current.add(model);
      currentModelGroupRef.current = model;
      showToast(
        isCustomModel ? `✅ Модель сцены "${customSceneModel.name}" загружена!` : '✅ 3D Модель сцены загружена!'
      );
    };

    const handleError = (err) => {
      if (cancelled) return;
      console.error('[3D Scene Model] Ошибка загрузки модели:', modelUrl);
      console.error('[3D Scene Model] Детали:', err);
      console.error('[3D Scene Model] activeModelUrl:', activeModelUrl, 'normalized:', modelUrl);
      showToast(isCustomModel ? '⚠️ Ошибка парсинга 3D модели сцены' : '⚠️ Не удалось загрузить модель сцены. Проверьте консоль.');
    };

    if (isCustomModel) {
      console.log('[3D Scene Model] Парсинг кастомной модели:', customSceneModel.name);
      loader.parse(
        customSceneModel.buffer,
        '',
        (gltf) => {
          if (gltf?.scene) {
            addModel(gltf.scene);
          } else {
            handleError(new Error('GLTF scene is empty'));
          }
        },
        handleError
      );
    } else {
      console.log('[3D Scene Model] Загрузка модели по URL:', modelUrl);
      loader.load(
        modelUrl,
        addModel,
        (xhr) => {
          if (xhr.total) {
            console.log(`[3D Scene Model] Прогресс загрузки: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
          }
        },
        handleError
      );
    }

    return () => {
      cancelled = true;
    };
  }, [activeModelUrl, customSceneModel]);

  // =========================================================
  // 4. СИНХРОНИЗАЦИЯ ХОТСПОТОВ В СЦЕНЕ
  // =========================================================

  useEffect(() => {
    if (!sceneRef.current || !hotspotsGroupRef.current) return;
    const group = hotspotsGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    // Ссылки для цикла кадра собираем заново вместе с группой,
    // иначе они бы указывали на удалённые объекты.
    diamondSpinListRef.current = [];
    hotspotObjectMapRef.current.clear();

    hotspots.forEach((hs) => {
      const isSelected = hs.id === selectedHotspotId;
      const colHex = COLOR_HEX_MAP[hs.color] || 0x10b981;
      const hsWrapper = new THREE.Group();
      hsWrapper.position.set(hs.position[0], hs.position[1], hs.position[2]);
      hsWrapper.userData = { hotspotId: hs.id };

      // 1. Объёмный бокс триггера
      const boxSize = hs.size || [1.2, 1.4, 1.2];
      const boxGeo = new THREE.BoxGeometry(boxSize[0], boxSize[1], boxSize[2]);
      const boxEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({
          color: isSelected ? 0xffffff : colHex,
          linewidth: isSelected ? 2 : 1,
        })
      );
      hsWrapper.add(boxEdges);
      boxEdges.visible = mode === 'editor';
      boxEdges.userData = { hotspotId: hs.id };

      const boxFill = new THREE.Mesh(
        boxGeo,
        new THREE.MeshBasicMaterial({
          color: colHex,
          transparent: true,
          opacity: isSelected ? 0.35 : 0.18,
          side: THREE.DoubleSide,
        })
      );
      boxFill.userData = { hotspotId: hs.id };
      boxFill.visible = mode === 'editor';
      hsWrapper.add(boxFill);

      // 2. Напольный ореол / кольцо
      const ringGeo = new THREE.RingGeometry(0.5, 0.75, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colHex,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.5,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = -boxSize[1] / 2 + 0.02;
      ringMesh.userData = { hotspotId: hs.id };
      hsWrapper.add(ringMesh);

      // 3. Голографический кристалл сверху
      const octGeo = new THREE.OctahedronGeometry(0.25, 0);
      const octMat = new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: colHex,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      });
      const diamond = new THREE.Mesh(octGeo, octMat);
      diamond.position.y = boxSize[1] / 2 + 0.3;
      diamond.name = 'diamond_crystal';
      diamond.userData = { hotspotId: hs.id };
      hsWrapper.add(diamond);
      // Ссылки на объекты для цикла кадра: и кристалл для вращения,
      // и обёртка для проекции бейджа.
      diamondSpinListRef.current.push(diamond);
      hotspotObjectMapRef.current.set(hs.id, hsWrapper);

      group.add(hsWrapper);
    });
  }, [hotspots, selectedHotspotId, mode]);

  // =========================================================
  // 5. СИНХРОНИЗАЦИЯ 3D ОБЪЕКТОВ В СЦЕНЕ
  // =========================================================

  useEffect(() => {
    if (!sceneRef.current || !objectsGroupRef.current) return;
    if (isGizmoDragging) return; // Не пересоздаём меши во время интерактивного перетаскивания

    const group = objectsGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const loader = new GLTFLoader();

    objects.forEach((obj) => {
      const isSelected = obj.id === selectedObjectId;
      const objWrapper = new THREE.Group();
      objWrapper.name = `scene_obj_${obj.id}`;
      objWrapper.userData = { sceneObjectId: obj.id };
      objWrapper.position.set(obj.position[0], obj.position[1], obj.position[2]);
      objWrapper.rotation.set(
        (obj.rotation[0] * Math.PI) / 180,
        (obj.rotation[1] * Math.PI) / 180,
        (obj.rotation[2] * Math.PI) / 180
      );
      objWrapper.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);

      const setupChild = (m) => {
        m.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = { sceneObjectId: obj.id, isHotspot: obj.isHotspot };
          }
        });
      };

      if (obj.modelType === 'custom_glb') {
        // Try to get buffer from cache, then modelBuffer property
        const buffer = obj.modelBuffer || objectBuffersCache.current.get(obj.id);
        if (buffer) {
          try {
            loader.parse(
              buffer,
              '',
              (gltf) => {
                const root = gltf.scene;
                setupChild(root);
                objWrapper.add(root);
                if (isSelected && mode === 'editor') {
                  const helper = new THREE.BoxHelper(root, 0x10b981);
                  objWrapper.add(helper);
                }
              },
              (e) => {
                console.error('[3D Scene Object] Failed to parse GLB:', e);
                // Show placeholder on error
                const placeholder = buildProceduralProp('wooden_crate');
                setupChild(placeholder);
                objWrapper.add(placeholder);
              }
            );
          } catch (err) {
            console.error('[3D Scene Object] Parse error:', err);
            // Show placeholder on catch
            const placeholder = buildProceduralProp('wooden_crate');
            setupChild(placeholder);
            objWrapper.add(placeholder);
          }
        } else {
          // No buffer available - show placeholder and warn
          console.warn(`[3D Scene Object] No buffer for custom object "${obj.name}" (${obj.id}) - showing placeholder`);
          const placeholder = buildProceduralProp('wooden_crate');
          setupChild(placeholder);
          objWrapper.add(placeholder);
        }
      } else {
        const propMesh = buildProceduralProp(obj.modelType);
        setupChild(propMesh);
        objWrapper.add(propMesh);
        if (isSelected && mode === 'editor') {
          const helper = new THREE.BoxHelper(propMesh, 0x10b981);
          objWrapper.add(helper);
        }
      }

      // Если объект назначен как хотспот, добавляем кольцо под ним
      if (obj.isHotspot && obj.hotspotConfig) {
        const colHex = COLOR_HEX_MAP[obj.hotspotConfig.color] || 0x10b981;
        const ringGeo = new THREE.RingGeometry(0.5, 0.75, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colHex,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.45,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.02;
        objWrapper.add(ringMesh);
      }

      group.add(objWrapper);
    });
  }, [objects, selectedObjectId, mode, isGizmoDragging]);

  // =========================================================
  // 6. ПРИВЯЗКА TRANSFORM CONTROLS К ВЫБРАННОМУ ОБЪЕКТУ
  // =========================================================

  useEffect(() => {
    if (!transformControlsRef.current) return;
    const tc = transformControlsRef.current;

    if (mode !== 'editor' || !selectedObjectId || !objectsGroupRef.current) {
      tc.detach();
      return;
    }

    const target = objectsGroupRef.current.children.find(
      (child) => child.userData?.sceneObjectId === selectedObjectId
    );

    if (target) {
      tc.attach(target);
      tc.setMode(transformMode);
      tc.translationSnap = snapGrid ? snapStep : null;
      tc.rotationSnap = snapGrid ? (15 * Math.PI) / 180 : null;
      tc.scaleSnap = snapGrid ? 0.1 : null;
    } else {
      tc.detach();
    }
  }, [selectedObjectId, objects, mode, transformMode, snapGrid, snapStep]);

  // Горячие клавиши (W: перемещение, E: поворот, R: масштаб, X: сетка, Esc: сброс)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (mode !== 'editor') return;

      if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') {
        setTransformMode('translate');
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        setTransformMode('rotate');
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        setTransformMode('scale');
      } else if (e.key === 'x' || e.key === 'X' || e.key === 'ч' || e.key === 'Ч') {
        setSnapGrid((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedObjectId(null);
        setSelectedHotspotId(null);
        setIsPlacementMode(false);
        setIsObjectPlacementMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);


  // Синхронизация режима редактора / игрока (камера, контролы, сетка)
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (gridRef.current) {
      gridRef.current.visible = showGrid && mode === 'editor';
    }
    // Круг фокуса — подсказка автора, игроку она не нужна.
    if (focusGroupRef.current) {
      focusGroupRef.current.visible = showFocusCircle && mode === 'editor';
    }
    if (ghostMarkerRef.current && mode === 'player') {
      ghostMarkerRef.current.visible = false;
    }
    if (transformControlsRef.current && mode === 'player') {
      transformControlsRef.current.detach();
    }

    // Радиус и центр круга обязательной видимости идут из настроек
    // камеры: круг всегда соответствует тому, что увидит игрок.
    if (focusGroupRef.current) {
      const [fx, fy, fz] = cameraConfig.target;
      focusGroupRef.current.position.set(fx, fy - 0.02, fz);
      focusGroupRef.current.scale.set(cameraConfig.focusRadius, 1, cameraConfig.focusRadius);
    }

    if (mode === 'player') {
      const pos = cameraConfig.position || [15, 10, 15];
      const target = cameraConfig.target || [0, 2, 0];
      camera.position.set(pos[0], pos[1], pos[2]);
      controls.target.set(target[0], target[1], target[2]);
      if (cameraConfig.fov) {
        camera.fov = cameraConfig.fov;
        camera.updateProjectionMatrix();
      }
      controls.update();

      controls.enablePan = false;
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enabled = false;
      controls.maxPolarAngle = Math.PI / 2 - 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 45;
    } else {
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enabled = !isGizmoDraggingRef.current;
      controls.maxPolarAngle = Math.PI - 0.05;
      controls.minDistance = 0.5;
      controls.maxDistance = 300;
    }
  }, [mode, cameraConfig, showGrid]);


  // =========================================================
  // ВИЗУАЛИЗАЦИЯ ВИДА КАМЕРЫ ИГРОКА (CameraHelper)
  // =========================================================

  useEffect(() => {
    if (!sceneRef.current || !dummyCameraRef.current) return;

    // Создаём или удаляем CameraHelper
    if (showCameraView && !cameraHelperRef.current) {
      const helper = new THREE.CameraHelper(dummyCameraRef.current);
      sceneRef.current.add(helper);
      cameraHelperRef.current = helper;
    }

    if (showCameraView && cameraHelperRef.current) {
      const pos = cameraConfig.position || [15, 10, 15];
      const target = cameraConfig.target || [0, 2, 0];

      // Обновляем dummy камеру
      dummyCameraRef.current.position.set(pos[0], pos[1], pos[2]);
      dummyCameraRef.current.up.set(0, 1, 0);
      dummyCameraRef.current.lookAt(target[0], target[1], target[2]);
      dummyCameraRef.current.fov = cameraConfig.fov || 48;
      dummyCameraRef.current.updateProjectionMatrix();

      // Обновляем helper
      cameraHelperRef.current.update();
      cameraHelperRef.current.visible = true;
    } else if (!showCameraView && cameraHelperRef.current) {
      sceneRef.current.remove(cameraHelperRef.current);
      cameraHelperRef.current = null;
    }

    return () => {
      if (cameraHelperRef.current) {
        sceneRef.current.remove(cameraHelperRef.current);
        cameraHelperRef.current = null;
      }
    };
  }, [showCameraView, cameraConfig]);


  // Слушатель движения мыши и тача для параллакса / наклона в режиме игрока
  useEffect(() => {
    let lastUpdate = 0;
    const handlePointerMove = (e) => {
      if (mode !== 'player') return;
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((clientY - rect.top) / rect.height) * 2 - 1);
      const clampedX = Math.max(-1, Math.min(1, normX));
      const clampedY = Math.max(-1, Math.min(1, normY));
      pointerRef.current = { x: clampedX, y: clampedY };

      // Индикатор показывает профиль, который правится сейчас, иначе
      // радар врал бы относительно выбранного устройства.
      const profile = cameraConfig.motion[editingDevice];
      const yawLimit = profile.yawDegrees;
      const pitchLimit = profile.pitchDegrees;
      const now = Date.now();
      if (now - lastUpdate > 30) {
        lastUpdate = now;
        setLiveAngleOffset({
          yaw: Number((-clampedX * yawLimit).toFixed(1)),
          pitch: Number((clampedY * pitchLimit).toFixed(1)),
        });
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [mode, cameraConfig.motion, editingDevice]);

  // =========================================================
  // 7. КЛИКИ ПО 3D ХОЛСТУ (ВЫДЕЛЕНИЕ, РАССТАНОВКА, ВЗАИМОДЕЙСТВИЕ)
  // =========================================================

  const handleCanvasPointerMove = (e) => {
    if (!cameraRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);

    if (isPlacementMode || isObjectPlacementMode) {
      if (!ghostMarkerRef.current) return;
      const targets = [];
      if (currentModelGroupRef.current) targets.push(currentModelGroupRef.current);
      const hits = raycasterRef.current.intersectObjects(targets.length > 0 ? targets : sceneRef.current.children, true);
      if (hits.length > 0) {
        const p = hits[0].point;
        ghostMarkerRef.current.visible = true;
        ghostMarkerRef.current.position.set(p.x, isObjectPlacementMode ? p.y : p.y + 0.7, p.z);
      } else {
        ghostMarkerRef.current.visible = false;
      }
    }
  };

  const handleCanvasClick = (e) => {
    if (!cameraRef.current || !canvasRef.current) return;
    if (isGizmoDragging) return;
    // В режиме сравнения сцена нарисована дважды, и координаты клика
    // не соответствуют ни одной из камер, поэтому выбор объектов
    // временно недоступен.
    if (comparePreview && mode === 'player') return;
    if (transformControlsRef.current && transformControlsRef.current.axis) return;

    // Проверка на смещение мыши (чтобы клик не срабатывал при вращении камеры)
    const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
    if (dist > 12) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);

    // 1. Размещение хотспота по клику на геометрию
    if (isPlacementMode) {
      const targets = [];
      if (currentModelGroupRef.current) targets.push(currentModelGroupRef.current);
      const hits = raycasterRef.current.intersectObjects(targets.length > 0 ? targets : sceneRef.current.children, true);
      if (hits.length > 0) {
        const p = hits[0].point;
        const newHs = {
          id: `hs_${Date.now()}`,
          title: `Зона #${hotspots.length + 1}`,
          action: availableActions[0]?.value || 'enter',
          icon: 'door',
          color: 'emerald',
          position: [Number(p.x.toFixed(2)), Number((p.y + 0.7).toFixed(2)), Number(p.z.toFixed(2))],
          size: [1.2, 1.4, 1.2],
        };
        setHotspots((prev) => [...prev, newHs]);
        setSelectedHotspotId(newHs.id);
        setIsPlacementMode(false);
        showToast('🎯 Новая 3D зона создана!');
      }
      return;
    }

    // 2. Размещение 3D объекта по клику на поверхность
    if (isObjectPlacementMode) {
      const targets = [];
      if (currentModelGroupRef.current) targets.push(currentModelGroupRef.current);
      const hits = raycasterRef.current.intersectObjects(targets.length > 0 ? targets : sceneRef.current.children, true);
      if (hits.length > 0) {
        const p = hits[0].point;
        const newObj = {
          id: `obj_${Date.now()}`,
          name: `${pendingObjectType} #${objects.length + 1}`,
          modelType: pendingObjectType,
          position: [Number(p.x.toFixed(2)), Number(p.y.toFixed(2)), Number(p.z.toFixed(2))],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          isHotspot: false,
        };
        setObjects((prev) => [...prev, newObj]);
        setSelectedObjectId(newObj.id);
        setIsObjectPlacementMode(false);
        showToast('📦 3D Объект успешно размещён!');
      }
      return;
    }

    // 3. Прямой клик по кубу триггера хотспота
    if (hotspotsGroupRef.current) {
      const hits = raycasterRef.current.intersectObjects(hotspotsGroupRef.current.children, true);
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
          if (mode === 'editor') {
            setSelectedHotspotId(foundId);
            setSelectedObjectId(null);
            setActiveTab('hotspots');
          } else {
            const h = hotspots.find((item) => item.id === foundId);
            if (h) setInteractedHotspot(h);
          }
          return;
        }
      }
    }

    // 4. Прямой клик по 3D объекту
    if (objectsGroupRef.current) {
      const hits = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);
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
          if (mode === 'editor') {
            setSelectedObjectId(foundObjId);
            setSelectedHotspotId(null);
            setActiveTab('objects');
          } else {
            const o = objects.find((item) => item.id === foundObjId);
            if (o && o.isHotspot && o.hotspotConfig) {
              setInteractedHotspot({
                id: o.id,
                title: o.hotspotConfig.title || o.name,
                action: o.hotspotConfig.action,
                icon: o.hotspotConfig.icon,
                subLocation: o.hotspotConfig.subLocation,
              });
            }
          }
          return;
        }
      }
    }

    // 5. Клик в пустое пространство (снятие выбора)
    if (mode === 'editor') {
      setSelectedHotspotId(null);
      setSelectedObjectId(null);
    }
  };

  // =========================================================
  // 8. ЭКСПОРТ И ИМПОРТ JSON
  // =========================================================

  const handleExportJSON = () => {
    const exportPayload = {
      locationId: effectiveLocId,
      modelUrl: normalizeModelUrl(activeModelUrl) || NO_SCENE_MODEL,
      customModelName: activeModelUrl === CUSTOM_SCENE_MODEL_URL ? customSceneModel?.name : undefined,
      // Переключатель 2D/3D без этого поля терялся при импорте, и
      // интерьер молча возвращался в режим «Авто».
      interiorMode,
      camera: cameraConfig,
      hotspots,
      objects: objects.map((o) => ({
        ...o,
        modelBuffer: undefined, // бинарный буфер не сохраняем в читаемый json
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3d_hotspots_${effectiveLocId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Файл 3D хотспотов экспортирован!');
  };

  const handleCopyJSON = () => {
    const payload = {
      locationId: effectiveLocId,
      modelUrl: normalizeModelUrl(activeModelUrl) || NO_SCENE_MODEL,
      customModelName: activeModelUrl === CUSTOM_SCENE_MODEL_URL ? customSceneModel?.name : undefined,
      interiorMode,
      camera: cameraConfig,
      hotspots,
      objects: objects.map((o) => ({ ...o, modelBuffer: undefined })),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    showToast('📋 Данные скопированы в буфер обмена!');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result as string);

        // Файл может быть сделан для другой локации. Молча применять
        // его здесь опасно: интерьер шахты переедет в автосалон, и
        // это обнаружится только при входе в игру.
        if (parsed.locationId && parsed.locationId !== effectiveLocId) {
          const apply = window.confirm(
            `Файл сделан для локации «${parsed.locationId}».\n` +
            `Сейчас выбран интерьер «${effectiveLocId}».\n\n` +
            'Загрузить сцену сюда?'
          );
          if (!apply) {
            e.target.value = '';
            return;
          }
        }

        if (Array.isArray(parsed.hotspots)) setHotspots(parsed.hotspots);
        if (Array.isArray(parsed.objects)) setObjects(parsed.objects);
        if (parsed.camera) setCameraConfig(withCameraDefaults(parsed.camera));

        // Модель из файла сюда не попадает: байты в JSON не пишутся.
        // Если в файле была своя модель, её нужно загрузить заново,
        // иначе интерьер молча останется на модели по умолчанию.
        if (parsed.customModelName) {
          setCustomSceneModel(null);
          setActiveModelUrl(normalizeModelUrl(parsed.modelUrl) || NO_SCENE_MODEL);
        } else {
          const savedModelUrl = normalizeModelUrl(parsed.modelUrl);
          if (savedModelUrl) setActiveModelUrl(savedModelUrl);
        }

        // Переключатель восстанавливаем явно: без него интерьер
        // вернулся бы в «Авто» и мог уехать в 2D.
        if (parsed.interiorMode === '2d' || parsed.interiorMode === '3d' || parsed.interiorMode === 'auto') {
          setInteriorModeState(parsed.interiorMode);
          setInteriorMode(effectiveLocId, parsed.interiorMode);
        }

        const notes = [];
        if (parsed.customModelName) {
          notes.push(`загрузите модель «${parsed.customModelName}» заново`);
        }
        if (parsed.objects?.some((o) => o.modelType === 'custom_glb')) {
          notes.push('объекты с загруженными моделями заменены заглушками');
        }
        showToast(
          notes.length ? `📤 Импортировано, но ${notes.join('; ')}` : '📤 Данные успешно импортированы!'
        );
      } catch (err) {
        showToast('⚠️ Ошибка чтения файла JSON!');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSceneModelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.glb') && !fileName.endsWith('.gltf')) {
      showToast('⚠️ Выберите файл сцены в формате .glb или .gltf');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const buffer = ev.target?.result;
      if (!(buffer instanceof ArrayBuffer)) {
        showToast('⚠️ Не удалось прочитать 3D модель');
        e.target.value = '';
        return;
      }

      setCustomSceneModel({ name: file.name, buffer });
      setActiveModelUrl(CUSTOM_SCENE_MODEL_URL);
      // Буфер пишем сразу и по ключу локации: пока пользователь
      // не нажмёт «Сохранить», перезагрузит страницу или уйдёт в игру,
      // игра уже должна суметь найти эту модель.
      const saved = await saveBufferToDB(sceneModelKey(effectiveLocId), buffer);
      showToast(
        saved
          ? `✅ Модель сцены "${file.name}" загружена!`
          : `⚠️ Модель "${file.name}" загружена, но не сохранена — IndexedDB недоступен`
      );
      e.target.value = '';
    };
    reader.onerror = () => {
      showToast('⚠️ Не удалось прочитать файл модели');
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // Фиксация текущего ракурса камеры
  const handleCaptureCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const pos = cameraRef.current.position.toArray().map((v) => Number(v.toFixed(2)));
    const target = controlsRef.current.target.toArray().map((v) => Number(v.toFixed(2)));
    setCameraConfig((prev) => ({ ...prev, position: pos, target }));
    showToast(`📸 Ракурс камеры зафиксирован! Pos: [${pos.join(', ')}]`);
  };

  return (
    <div className="absolute inset-0 z-[120] bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Toast уведомление */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2 border border-emerald-300">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧊</span>
            <span className="font-black text-sm uppercase tracking-wider text-emerald-400">
              3D Хотспоты & Сцены
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              TG SAMP
            </span>
          </div>

          {/* Селектор локации */}
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <span className="text-xs text-slate-400">Локация:</span>
            <select
              value={selectedLocId}
              onChange={(e) => {
                setSelectedLocId(e.target.value);
                setEditingSubLocation(null);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:border-emerald-500 outline-none"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.icon || '📍'} {loc.name} ({loc.id})
                </option>
              ))}
            </select>

            {/* Какой интерьер откроется в игре для этой локации */}
            <div
              className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700"
              title={`В игре этот интерьер откроется как: ${
                hasScene3D(effectiveLocId) ? '3D-сцена' : '2D-картинка'
              }. Сохраняется вместе со сценой.`}
            >
              {([
                { value: '2d', label: '2D', icon: '🖼️' },
                { value: '3d', label: '3D', icon: '🧊' },
                { value: 'auto', label: 'Авто', icon: '✨' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => applyInteriorMode(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    interiorMode === opt.value
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Хлебные крошки для подлокаций */}
          {editingSubLocation && (
            <div className="flex items-center gap-2 text-xs bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg">
              <span className="text-cyan-400 font-bold">Комната: {editingSubLocation.subName}</span>
              <button
                onClick={() => setEditingSubLocation(null)}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                ← Вернуться
              </button>
            </div>
          )}
        </div>

        {/* Верхние действия */}
        <div className="flex items-center gap-2">
          {/* Режим: Редактор / Игрок */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setMode('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'editor' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders size={13} /> Редактор
            </button>
            <button
              onClick={() => {
                setMode('player');
                setSelectedHotspotId(null);
                setSelectedObjectId(null);
                setIsPlacementMode(false);
                setIsObjectPlacementMode(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'player' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={13} /> Режим игрока
            </button>
          </div>

          <button
            onClick={() => setShowTwaFrame((prev) => !prev)}
            title="Переключить рамку симулятора Telegram WebApp"
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition ${
              showTwaFrame
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={16} />
          </button>

          <button
            onClick={saveLocationData}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <Save size={14} /> Сохранить
          </button>

          <button
            onClick={handleExportJSON}
            title="Экспортировать 3D сцену в JSON файл"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <Download size={16} />
          </button>

          <label
            title="Импортировать 3D сцену из JSON"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Upload size={16} />
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleCopyJSON}
            title="Скопировать JSON в буфер"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <Copy size={16} />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 transition ml-2"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Центральный 3D Вьюпорт */}
        <main className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center">
          {/* Контейнер холста (с возможностью обрамления рамкой TWA) */}
          <div
            ref={containerRef}
            className={`relative transition-all duration-300 overflow-hidden ${
              showTwaFrame
                ? 'w-[390px] h-[780px] rounded-[48px] border-[10px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.8)]'
                : 'w-full h-full'
            }`}
          >
            {/* Плавающая панель трансформации объекта в 3D */}
            {mode === 'editor' && selectedObject && !isPlacementMode && !isObjectPlacementMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-xs select-none">
                <div className="px-2.5 py-1 text-slate-200 font-bold border-r border-slate-800 flex items-center gap-1.5">
                  <Box size={14} className="text-emerald-400" />
                  <span className="truncate max-w-[130px] font-mono">{selectedObject.name}</span>
                </div>

                <button
                  onClick={() => setTransformMode('translate')}
                  title="Перемещение курсором по осям (Горячая клавиша: W)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition ${
                    transformMode === 'translate'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Move size={13} /> Смещение [W]
                </button>

                <button
                  onClick={() => setTransformMode('rotate')}
                  title="Вращение курсором (Горячая клавиша: E)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition ${
                    transformMode === 'rotate'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <RotateCw size={13} /> Поворот [E]
                </button>

                <button
                  onClick={() => setTransformMode('scale')}
                  title="Масштабирование курсором (Горячая клавиша: R)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold transition ${
                    transformMode === 'scale'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Maximize2 size={13} /> Размер [R]
                </button>

                <div className="w-[1px] h-4 bg-slate-800 my-auto mx-0.5" />

                <button
                  onClick={() => setSnapGrid((prev) => !prev)}
                  title="Привязка к сетке (Горячая клавиша: X)"
                  className={`flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-[11px] transition ${
                    snapGrid
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Grid size={13} />
                  <span>{snapGrid ? `Сетка ${snapStep}м` : 'Сетка: выкл'}</span>
                </button>

                <button
                  onClick={() => {
                    const p = [selectedObject.position[0], 0, selectedObject.position[2]];
                    setObjects((prev) =>
                      prev.map((o) => (o.id === selectedObject.id ? { ...o, position: p } : o))
                    );
                  }}
                  title="Опустить объект на уровень пола (Y = 0)"
                  className="flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-[11px] text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                >
                  <ArrowDown size={12} /> Y=0
                </button>

                <button
                  onClick={() => setSelectedObjectId(null)}
                  title="Снять выбор (Esc)"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Подсказка при режиме расстановки */}
            {isPlacementMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce backdrop-blur border border-emerald-300 pointer-events-none">
                <Crosshair size={16} className="animate-spin" />
                <span>Кликните по 3D поверхности для установки новой зоны</span>
              </div>
            )}

            {isObjectPlacementMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-cyan-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce backdrop-blur border border-cyan-300 pointer-events-none">
                <Box size={16} className="animate-spin" />
                <span>Кликните по поверхности сцены для размещения объекта</span>
              </div>
            )}

            {/* Real-time HUD координат во время перетаскивания курсором */}
            {liveTransformInfo && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-slate-950/95 border border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] backdrop-blur text-xs text-white font-mono flex items-center gap-3.5 pointer-events-none select-none">
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {transformMode === 'translate' ? 'Координаты' : transformMode === 'rotate' ? 'Вращение' : 'Масштаб'}
                </span>
                {transformMode === 'translate' && (
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">X: {liveTransformInfo.position[0].toFixed(2)}м</span>
                    <span className="text-emerald-400 font-bold">Y: {liveTransformInfo.position[1].toFixed(2)}м</span>
                    <span className="text-blue-400 font-bold">Z: {liveTransformInfo.position[2].toFixed(2)}м</span>
                  </div>
                )}
                {transformMode === 'rotate' && (
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">X: {liveTransformInfo.rotation[0]}°</span>
                    <span className="text-emerald-400 font-bold">Y: {liveTransformInfo.rotation[1]}°</span>
                    <span className="text-blue-400 font-bold">Z: {liveTransformInfo.rotation[2]}°</span>
                  </div>
                )}
                {transformMode === 'scale' && (
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">X: {liveTransformInfo.scale[0]}x</span>
                    <span className="text-emerald-400 font-bold">Y: {liveTransformInfo.scale[1]}x</span>
                    <span className="text-blue-400 font-bold">Z: {liveTransformInfo.scale[2]}x</span>
                  </div>
                )}
              </div>
            )}

            {/* Плавающий интерфейс для Режима Игрока */}
            {mode === 'player' && (
              <>
                <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={() => setMode('editor')}
                      className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-xl transition active:scale-95"
                    >
                      <ArrowLeft size={14} /> Редактор
                    </button>
                    <div className="px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-slate-800 backdrop-blur-md text-xs font-bold text-slate-200 flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Вид игрока</span>
                      {editingSubLocation ? (
                        <span className="text-cyan-300 font-mono">[{editingSubLocation.subName}]</span>
                      ) : (
                        <span className="text-slate-400 font-mono">
                          [{LOCATIONS.find((l) => l.id === selectedLocId)?.name || selectedLocId}]
                        </span>
                      )}
                    </div>
                    {editingSubLocation && (
                      <button
                        onClick={() => {
                          setEditingSubLocation(null);
                          showToast('🚪 Вы вышли на улицу');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold backdrop-blur-md transition active:scale-95"
                      >
                        ← Выйти из подлокации
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={() => {
                        if (cameraRef.current && controlsRef.current) {
                          const pos = cameraConfig.position || [15, 10, 15];
                          const target = cameraConfig.target || [0, 2, 0];
                          cameraRef.current.position.set(pos[0], pos[1], pos[2]);
                          controlsRef.current.target.set(target[0], target[1], target[2]);
                          controlsRef.current.update();
                          showToast('🎥 Ракурс сброшен к исходному');
                        }
                      }}
                      title="Сбросить ракурс камеры"
                      className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-xl transition active:scale-95"
                    >
                      <Compass size={14} /> Исходный ракурс
                    </button>
                    <button
                      onClick={() => setShowTwaFrame((prev) => !prev)}
                      title="Переключить рамку Telegram WebApp"
                      className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition active:scale-95 ${
                        showTwaFrame
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="px-4 py-2 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/80 text-center shadow-xl">
                    <p className="text-[11px] font-bold text-slate-300">
                      🖱️ Наклон камеры следует за указателем • 🎯 Кликните по маркеру или бейджу для действия
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Радар гироскопа наклона (Tilt / Parallax) */}
            {mode === 'player' && (
              <div className="absolute bottom-4 left-4 z-30 bg-slate-950/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex items-center gap-3 text-xs select-none pointer-events-none">
                <div className="relative w-10 h-10 rounded-full border border-emerald-500/40 bg-slate-900/90 flex items-center justify-center flex-shrink-0">
                  <div className="absolute w-full h-[1px] bg-emerald-500/25" />
                  <div className="absolute h-full w-[1px] bg-emerald-500/25" />
                  <div className="absolute w-5 h-5 rounded-full border border-emerald-500/20" />
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] transition-transform duration-75"
                    style={{
                      transform: `translate(${-(liveAngleOffset.yaw / (editingProfile.yawDegrees || 10)) * 12}px, ${-(liveAngleOffset.pitch / (editingProfile.pitchDegrees || 5)) * 12}px)`,
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white text-[11px]">Наклон камеры (Tilt)</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      ±{editingProfile.yawDegrees}° / ±{editingProfile.pitchDegrees}°
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] font-mono text-emerald-400/90 mt-0.5">
                    <span>Yaw: <b className="text-white">{liveAngleOffset.yaw > 0 ? `+${liveAngleOffset.yaw}` : liveAngleOffset.yaw}°</b></span>
                    <span>Pitch: <b className="text-white">{liveAngleOffset.pitch > 0 ? `+${liveAngleOffset.pitch}` : liveAngleOffset.pitch}°</b></span>
                    <span className="text-slate-400">LERP: {editingProfile.smoothness}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={handleCanvasPointerMove}
              onClick={handleCanvasClick}
              className={`w-full h-full block ${
                isPlacementMode || isObjectPlacementMode
                  ? 'cursor-crosshair'
                  : isGizmoDragging
                  ? 'cursor-grabbing'
                  : mode === 'editor'
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-default'
              }`}
            />

            {/* Разделитель двойного превью: слева кадр на ПК, справа
                на телефоне. Подписи нужны, иначе половины неразличимы. */}
            {mode === 'player' && comparePreview && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500/50" />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <span className="bg-slate-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ПК 16:9
                  </span>
                  <span className="bg-slate-950/90 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    Телефон
                  </span>
                </div>
              </div>
            )}

            {/* 2D Слой HTML бейджей хотспотов, проецируемых из 3D мира */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {hotspots.map((hs) => {
                const isSelected = hs.id === selectedHotspotId;
                const colDef = HOTSPOT_COLORS.find((c) => c.id === hs.color) || HOTSPOT_COLORS[0];
                const iconDef = HOTSPOT_ICONS.find((i) => i.id === hs.icon) || HOTSPOT_ICONS[0];
                const IconComp = iconDef.icon;

                return (
                  <div
                    key={hs.id}
                    ref={(el) => {
                      if (el) hotspotDomRefs.current.set(hs.id, el);
                      else hotspotDomRefs.current.delete(hs.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mode === 'editor') {
                        setSelectedHotspotId(hs.id);
                        setSelectedObjectId(null);
                        setActiveTab('hotspots');
                      } else {
                        setInteractedHotspot(hs);
                      }
                    }}
                    className={`absolute top-0 left-0 pointer-events-auto cursor-pointer transition-all duration-150 flex flex-col items-center ${
                      isSelected ? 'z-30 scale-110' : 'z-10'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-2xl border backdrop-blur-md transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-white text-white ring-2 ring-emerald-400'
                          : 'bg-slate-950/85 border-slate-700 text-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg ${colDef.bg} text-slate-950 flex items-center justify-center shrink-0`}>
                        <IconComp size={12} />
                      </div>
                      <span className="font-bold text-[11px] whitespace-nowrap">{hs.title}</span>
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                        {hs.action}
                      </span>
                    </div>
                    {/* Указательная стрелочка бейджа */}
                    <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-slate-700 rotate-45 -mt-1" />
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ================= RIGHT SIDEBAR ================= */}
        {mode === 'editor' && (
          <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20 overflow-hidden">
          {/* Вкладки сайдбара */}
          <div className="flex border-b border-slate-800 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('hotspots')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'hotspots'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair size={14} /> Хотспоты ({hotspots.length})
            </button>
            <button
              onClick={() => setActiveTab('objects')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'objects'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Box size={14} /> 3D Объекты ({objects.length})
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={14} /> Камера
            </button>
          </div>

          {/* Содержимое вкладки */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ----------------- ВКЛАДКА 1: ХОТСПОТЫ ----------------- */}
            {activeTab === 'hotspots' && (
              <div className="space-y-4">
                {/* Кнопка создания хотспота */}
                <button
                  onClick={() => {
                    setIsPlacementMode(true);
                    setIsObjectPlacementMode(false);
                    setSelectedHotspotId(null);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    isPlacementMode
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  <Crosshair size={15} />
                  <span>{isPlacementMode ? 'Кликните по 3D модели...' : '+ Установить 3D Хотспот'}</span>
                </button>

                {/* Настройки выбранного хотспота */}
                {selectedHotspot ? (
                  <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">Настройка зоны</span>
                      <button
                        onClick={() => {
                          setHotspots((prev) => prev.filter((h) => h.id !== selectedHotspot.id));
                          setSelectedHotspotId(null);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Удалить зону"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Название / Текст кнопки:</label>
                      <input
                        type="text"
                        value={selectedHotspot.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHotspots((prev) =>
                            prev.map((h) => (h.id === selectedHotspot.id ? { ...h, title: val } : h))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Игровое действие (Action):</label>
                      <select
                        value={selectedHotspot.action}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHotspots((prev) =>
                            prev.map((h) => (h.id === selectedHotspot.id ? { ...h, action: val } : h))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                      >
                        {availableActions.map((act) => (
                          <option key={act.value} value={act.value}>
                            {act.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Настройка подлокации / комнаты */}
                    {(selectedHotspot.action === 'sublocation' || selectedHotspot.action === 'garage') && (
                      <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg space-y-2">
                        <label className="text-[10px] text-cyan-400 font-bold block">
                          Имя комнаты / подлокации:
                        </label>
                        <input
                          type="text"
                          placeholder="инт, garage, kitchen..."
                          value={selectedHotspot.subLocation || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHotspots((prev) =>
                              prev.map((h) => (h.id === selectedHotspot.id ? { ...h, subLocation: val } : h))
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={() => {
                            const sub = selectedHotspot.subLocation || 'инт';
                            setEditingSubLocation({ parentId: selectedLocId, subName: sub });
                          }}
                          className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1"
                        >
                          <Sparkles size={12} /> Редактировать эту комнату
                        </button>
                      </div>
                    )}

                    {/* Выбор иконки */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Иконка маркера:</label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {HOTSPOT_ICONS.map((item) => {
                          const IconComp = item.icon;
                          const isCur = selectedHotspot.icon === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setHotspots((prev) =>
                                  prev.map((h) => (h.id === selectedHotspot.id ? { ...h, icon: item.id } : h))
                                );
                              }}
                              title={item.label}
                              className={`p-1.5 rounded-lg flex items-center justify-center border transition ${
                                isCur
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <IconComp size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Выбор цвета */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Цветовой стиль:</label>
                      <div className="flex items-center gap-2">
                        {HOTSPOT_COLORS.map((col) => {
                          const isCur = selectedHotspot.color === col.id;
                          return (
                            <button
                              key={col.id}
                              onClick={() => {
                                setHotspots((prev) =>
                                  prev.map((h) => (h.id === selectedHotspot.id ? { ...h, color: col.id } : h))
                                );
                              }}
                              className={`w-6 h-6 rounded-full ${col.bg} transition-transform ${
                                isCur ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Координаты центра [X, Y, Z] */}
                    <div className="pt-2 border-t border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Координаты в 3D (м):</span>
                        <button
                          onClick={() => {
                            const p = [...selectedHotspot.position];
                            p[1] = 0.7; // опустить к полу
                            setHotspots((prev) =>
                              prev.map((h) => (h.id === selectedHotspot.id ? { ...h, position: p } : h))
                            );
                          }}
                          className="text-emerald-400 hover:underline flex items-center gap-0.5"
                        >
                          <ArrowDown size={11} /> На пол
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
                        {['X', 'Y', 'Z'].map((axis, i) => (
                          <input
                            key={axis}
                            type="number"
                            step="0.2"
                            value={selectedHotspot.position[i]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const p = [...selectedHotspot.position];
                              p[i] = val;
                              setHotspots((prev) =>
                                prev.map((h) => (h.id === selectedHotspot.id ? { ...h, position: p } : h))
                              );
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-center"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    <p>Выберите хотспот на сцене или нажмите кнопку выше</p>
                  </div>
                )}

                {/* Список всех зон */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Список всех зон ({hotspots.length})
                  </span>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {hotspots.map((hs) => {
                      const isSel = hs.id === selectedHotspotId;
                      return (
                        <div
                          key={hs.id}
                          onClick={() => setSelectedHotspotId(hs.id)}
                          className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                            isSel
                              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300'
                          }`}
                        >
                          <span className="font-bold truncate">{hs.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{hs.action}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- ВКЛАДКА 2: 3D ОБЪЕКТЫ ----------------- */}
            {activeTab === 'objects' && (
              <div className="space-y-4">
                {/* Меню добавления объектов */}
                <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 block">Добавить 3D Объект:</span>

                  {/* Выбор пропса */}
                  <select
                    value={pendingObjectType}
                    onChange={(e) => setPendingObjectType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    {PROP_PRESET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setIsObjectPlacementMode(true);
                      setIsPlacementMode(false);
                      setSelectedObjectId(null);
                    }}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                      isObjectPlacementMode
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                    }`}
                  >
                    <Box size={14} />
                    <span>{isObjectPlacementMode ? 'Кликните по сцене...' : 'Разместить в 3D сцене'}</span>
                  </button>

                  {/* Загрузка своего .GLB файла */}
                  <div className="pt-2 border-t border-slate-700/60">
                    <label className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <FolderPlus size={13} className="text-emerald-400" />
                      <span>Загрузить свой .GLB файл</span>
                      <input
                        type="file"
                        accept=".glb"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const buffer = ev.target.result as ArrayBuffer;
                            const newObj = {
                              id: `custom_glb_${Date.now()}`,
                              name: file.name.replace('.glb', ''),
                              modelType: 'custom_glb',
                              position: [0, 0, 0],
                              rotation: [0, 0, 0],
                              scale: [1, 1, 1],
                              isHotspot: false,
                            };
                            // Save buffer to IndexedDB
                            await saveBufferToDB(`${CUSTOM_OBJECT_PREFIX}${newObj.id}`, buffer);
                            // Cache in memory
                            objectBuffersCache.current.set(newObj.id, buffer);
                            setObjects((prev) => [...prev, newObj]);
                            setSelectedObjectId(newObj.id);
                            showToast(`✅ Загружен кастомный 3D объект: ${file.name}`);
                          };
                          reader.readAsArrayBuffer(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Настройка выбранного объекта */}
                {selectedObject ? (
                  <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">Свойства объекта</span>
                      <button
                        onClick={async () => {
                          const objId = selectedObject.id;
                          if (selectedObject.modelType === 'custom_glb') {
                            await deleteBufferFromDB(`${CUSTOM_OBJECT_PREFIX}${objId}`);
                            objectBuffersCache.current.delete(objId);
                          }
                          setObjects((prev) => prev.filter((o) => o.id !== objId));
                          setSelectedObjectId(null);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Удалить объект"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Имя объекта:</label>
                      <input
                        type="text"
                        value={selectedObject.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setObjects((prev) =>
                            prev.map((o) => (o.id === selectedObject.id ? { ...o, name: val } : o))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Подсказка по управлению курсором */}
                    <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300 flex items-center justify-between">
                      <span>Перемещение курсором в 3D:</span>
                      <span className="font-mono bg-emerald-500/20 px-1 rounded">W / E / R</span>
                    </div>

                    {/* Чекбокс: Назначить объект как ХОТ-СПОТ */}
                    <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedObject.isHotspot}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setObjects((prev) =>
                              prev.map((o) =>
                                o.id === selectedObject.id
                                  ? {
                                      ...o,
                                      isHotspot: checked,
                                      hotspotConfig: checked
                                        ? o.hotspotConfig || {
                                            action: 'enter',
                                            color: 'emerald',
                                            icon: 'door',
                                          }
                                        : undefined,
                                    }
                                  : o
                              )
                            );
                          }}
                          className="accent-emerald-500 w-4 h-4 rounded"
                        />
                        <span className="font-bold text-[11px] text-white">Назначить объект хотспотом</span>
                      </label>

                      {selectedObject.isHotspot && (
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Действие по клику:</label>
                            <select
                              value={selectedObject.hotspotConfig?.action || 'enter'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setObjects((prev) =>
                                  prev.map((o) =>
                                    o.id === selectedObject.id
                                      ? { ...o, hotspotConfig: { ...o.hotspotConfig, action: val } }
                                      : o
                                  )
                                );
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                            >
                              {availableActions.map((act) => (
                                <option key={act.value} value={act.value}>
                                  {act.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Подлокация. У обычного хотспота это поле
                              есть, а у объекта-хотспота раньше было
                              недоступно: переход в подлокацию работал
                              только для зон, хотя в игре проверяется
                              одинаково для обоих. */}
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">
                              Переход в подлокацию (имя):
                            </label>
                            <input
                              type="text"
                              placeholder="Пусто — без перехода"
                              value={selectedObject.hotspotConfig?.subLocation || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setObjects((prev) =>
                                  prev.map((o) =>
                                    o.id === selectedObject.id
                                      ? {
                                          ...o,
                                          hotspotConfig: {
                                            ...o.hotspotConfig,
                                            subLocation: val,
                                          },
                                        }
                                      : o
                                  )
                                );
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-cyan-400"
                            />
                            {selectedObject.hotspotConfig?.subLocation && (
                              <button
                                onClick={() => {
                                  setEditingSubLocation({
                                    parentId: selectedLocId,
                                    subName: selectedObject.hotspotConfig.subLocation,
                                  });
                                }}
                                className="w-full mt-1.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1"
                              >
                                <Sparkles size={12} /> Редактировать эту комнату
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Числовые координаты */}
                    <div className="space-y-1 font-mono text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Позиция [X, Y, Z]:</span>
                      <div className="grid grid-cols-3 gap-1">
                        {['X', 'Y', 'Z'].map((axis, i) => (
                          <input
                            key={axis}
                            type="number"
                            step="0.2"
                            value={selectedObject.position[i]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const p = [...selectedObject.position];
                              p[i] = val;
                              setObjects((prev) =>
                                prev.map((o) => (o.id === selectedObject.id ? { ...o, position: p } : o))
                              );
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white text-center"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    <p>Выберите объект на сцене или добавьте новый</p>
                  </div>
                )}

                {/* Список объектов */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Объекты в сцене ({objects.length})
                  </span>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {objects.map((obj) => (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObjectId(obj.id)}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                          obj.id === selectedObjectId
                            ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300'
                        }`}
                      >
                        <span className="font-bold truncate">{obj.name}</span>
                        {obj.isHotspot && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Хотспот
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- ВКЛАДКА 3: КАМЕРА & СЦЕНА ----------------- */}
            {activeTab === 'camera' && (
              <div className="space-y-4 text-xs">
                {/* Модель сцены */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 block">3D Модель окружения:</label>
                  <select
                    value={activeModelUrl}
                    onChange={(e) => setActiveModelUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500"
                  >
                    {SCENE_MODEL_PRESETS.map((p) => (
                      <option key={p.id} value={p.url}>
                        {p.name}
                      </option>
                    ))}
                    {customSceneModel && (
                      <option key={CUSTOM_SCENE_MODEL_URL} value={CUSTOM_SCENE_MODEL_URL}>
                        {customSceneModel.name}
                      </option>
                    )}
                  </select>
                </div>

                <label
                  title="Загрузить внешнюю модель сцены"
                  className="w-full py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <FolderPlus size={14} className="text-emerald-400" />
                  <span>Загрузить свою модель сцены (.glb / .gltf)</span>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleSceneModelUpload}
                    className="hidden"
                  />
                </label>

                {activeModelUrl === CUSTOM_SCENE_MODEL_URL && customSceneModel && (
                  <div className="flex items-center justify-between p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300">
                    <span className="truncate">Активна модель: {customSceneModel.name}</span>
                    <button
                      onClick={() => {
                        setCustomSceneModel(null);
                        setActiveModelUrl(NO_SCENE_MODEL);
                      }}
                      className="text-emerald-200 hover:text-white flex items-center gap-1 shrink-0"
                    >
                      <X size={12} /> Убрать
                    </button>
                  </div>
                )}

                {/* Фиксация ракурса камеры */}
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2.5">
                  <span className="font-bold text-slate-200 block">Ракурс камеры локации</span>
                  <p className="text-[11px] text-slate-400">
                    Поверните и приблизьте сцену мышью, затем нажмите кнопку, чтобы закрепить стартовый ракурс:
                  </p>
                  <button
                    onClick={handleCaptureCamera}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Compass size={14} /> Зафиксировать ракурс
                  </button>

                  <div className="pt-2 border-t border-slate-700/60 text-[10px] font-mono text-slate-400 space-y-1">
                    <div>Pos: [{cameraConfig.position.join(', ')}]</div>
                    <div>Target: [{cameraConfig.target.join(', ')}]</div>
                  </div>
                </div>

                {/* Движение игрока. Два профиля: на телефоне наведения
                    курсором нет, поэтому камеру приходится двигать
                    сильнее, иначе часть интерьера просто не открыть. */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Sliders size={15} className="text-emerald-400" />
                    <span>Движение камеры у игрока</span>
                  </div>

                  <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                    {([
                      { key: 'desktop', label: '🖥️ ПК', hint: 'Мышь, лёгкий параллакс' },
                      { key: 'mobile', label: '📱 Телефон', hint: 'Без наведения, шире размах' },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setEditingDevice(t.key)}
                        title={t.hint}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                          editingDevice === t.key
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comparePreview}
                      onChange={(e) => setComparePreview(e.target.checked)}
                      className="accent-emerald-500"
                    />
                    <span>Сравнить ПК и телефон сразу</span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProfile.enabled}
                      onChange={(e) => updateProfile({ enabled: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span>Камера следует за указателем</span>
                  </label>

                  <div className="space-y-3">
                    {[
                      { key: 'yawDegrees', label: 'Поворот влево/вправо (Yaw)', min: 0, max: 35, step: 1, unit: '°' },
                      { key: 'pitchDegrees', label: 'Поворот вверх/вниз (Pitch)', min: 0, max: 25, step: 1, unit: '°' },
                      { key: 'positionShift', label: 'Смещение позиции', min: 0, max: 0.3, step: 0.01, unit: 'м' },
                      { key: 'smoothness', label: 'Плавность слежения', min: 0.01, max: 0.3, step: 0.01, unit: '' },
                      { key: 'zoomMin', label: 'Максимальное приближение', min: 0.3, max: 1, step: 0.05, unit: '×' },
                      { key: 'zoomMax', label: 'Максимальное отдаление', min: 1, max: 2.5, step: 0.05, unit: '×' },
                    ].map((row) => (
                      <div key={row.key} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{row.label}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {editingProfile[row.key]}
                            {row.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={row.min}
                          max={row.max}
                          step={row.step}
                          value={editingProfile[row.key] as number}
                          onChange={(e) => updateProfile({ [row.key]: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Радиус обязательной видимости: что игрок обязан увидеть
                      сразу, не двигая камеру. Проверяем на обоих экранах. */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Обязательно видно сразу (радиус):</span>
                      <span className="font-mono text-emerald-400 font-bold">{cameraConfig.focusRadius}м</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      step="0.5"
                      value={cameraConfig.focusRadius}
                      onChange={(e) =>
                        setCameraConfig((prev) => ({ ...prev, focusRadius: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <FocusCheckRow aspect={REFERENCE_ASPECT} label="ПК 16:9" config={cameraConfig} />
                    <FocusCheckRow aspect={PHONE_ASPECT} label="Телефон 390×780" config={cameraConfig} />
                    <button
                      type="button"
                      onClick={() => setShowFocusCircle((prev) => !prev)}
                      className={`w-full py-1.5 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                        showFocusCircle
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Crosshair size={12} />
                      {showFocusCircle ? 'Скрыть круг в сцене' : 'Показать круг в сцене'}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  {/* Кнопки Сетка пола, Вид камеры и Рамка TG */}
                  <div className="pt-1 space-y-2.5">
                    <div className="flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowGrid((prev) => !prev)}
                        className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition active:scale-95 ${
                          showGrid
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Grid size={14} className={showGrid ? 'text-amber-400' : 'text-slate-400'} />
                        <span>Сетка пола</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTwaFrame((prev) => !prev)}
                        className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition active:scale-95 ${
                          showTwaFrame
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Smartphone size={14} className={showTwaFrame ? 'text-blue-400' : 'text-slate-400'} />
                        <span>Рамка TG</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCameraView((prev) => !prev)}
                      className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition active:scale-95 ${
                        showCameraView
                          ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 shadow-sm shadow-violet-500/10'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye size={14} className={showCameraView ? 'text-violet-400' : 'text-slate-400'} />
                      <span>Показать вид камеры (фрустум)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>

      {/* Модалка демонстрации взаимодействия в Режиме Игрока */}
      {interactedHotspot && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 text-white shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Действие хотспота (TG SAMP)
              </span>
              <button onClick={() => setInteractedHotspot(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
              <div className="font-bold text-base text-white">{interactedHotspot.title}</div>
              <div className="text-xs text-slate-400 font-mono">
                Payload action: <span className="text-emerald-300 font-bold">{interactedHotspot.action}</span>
              </div>
              {interactedHotspot.subLocation && (
                <div className="text-xs text-cyan-300 font-mono">
                  Подлокация / комната: {interactedHotspot.subLocation}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {interactedHotspot.subLocation && (
                <button
                  onClick={() => {
                    setEditingSubLocation({
                      parentId: selectedLocId,
                      subName: interactedHotspot.subLocation,
                    });
                    setInteractedHotspot(null);
                  }}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs transition"
                >
                  Перейти в {interactedHotspot.subLocation}
                </button>
              )}
              <button
                onClick={() => setInteractedHotspot(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
