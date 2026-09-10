// src/components/HotspotTool3D.jsx
// Полнофункциональный 3D Редактор Хотспотов и Объектов для TG SAMP
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
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
import { LOCATIONS } from '../data/locations';
import { LOCATION_ACTIONS, getActionsForCategory, getLocationCategory } from '../data/locationActions';
import { PROP_PRESET_OPTIONS, buildProceduralProp } from '../utils/proceduralProps';

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

// Пресеты моделей сцен
const SCENE_MODEL_PRESETS = [
  { id: 'myscene', name: '🏙️ Экстерьер (myscene.glb)', url: '/models/myscene.glb' },
  { id: 'garage', name: '🅿️ 3D Гараж (garage.glb)', url: '/models/3dlocation/garage.glb' },
  { id: 'procedural_grid', name: '🌐 Сетка полигона (Без модели)', url: 'procedural' },
];

const STORAGE_KEY = 'tgsamp_3d_hotspots_v1';

export default function HotspotTool3D({ onClose }) {
  // Выбор локации и подлокации
  const [selectedLocId, setSelectedLocId] = useState('showroom_ls');
  const [editingSubLocation, setEditingSubLocation] = useState(null); // { parentId, subName }
  const [activeModelUrl, setActiveModelUrl] = useState('/models/myscene.glb');

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

  // Камера и настройки
  const [cameraConfig, setCameraConfig] = useState({
    position: [15, 10, 15],
    target: [0, 2, 0],
    fov: 48,
    parallax: { enabled: true, maxAngleYaw: 10, maxAnglePitch: 5 },
  });

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

  // DOM badge elements ref map
  const hotspotDomRefs = useRef(new Map());
  const objectDomRefs = useRef(new Map());

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
  }, [hotspots, selectedHotspotId]);

  // =========================================================
  // 1. ЗАГРУЗКА И СОХРАНЕНИЕ ДАННЫХ ЛОКАЦИИ (LocalStorage / JSON)
  // =========================================================

  const loadLocationData = useCallback((locKey) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const allData = JSON.parse(raw);
      const locData = allData[locKey];
      if (locData) {
        if (locData.hotspots) setHotspots(locData.hotspots);
        if (locData.objects) setObjects(locData.objects);
        if (locData.camera) setCameraConfig(locData.camera);
        if (locData.modelUrl) setActiveModelUrl(locData.modelUrl);
        return true;
      }
    } catch (e) {
      console.error('Error loading 3D hotspots:', e);
    }
    return false;
  }, []);

  const saveLocationData = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const allData = raw ? JSON.parse(raw) : {};

      allData[effectiveLocId] = {
        modelUrl: activeModelUrl,
        camera: cameraConfig,
        hotspots,
        objects,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      showToast('✅ 3D данные сцены сохранены в LocalStorage!');
      return true;
    } catch (e) {
      console.error(e);
      showToast('⚠️ Ошибка сохранения данных!');
      return false;
    }
  }, [effectiveLocId, activeModelUrl, cameraConfig, hotspots, objects]);

  // При смене локации загружаем её данные
  useEffect(() => {
    const loaded = loadLocationData(effectiveLocId);
    if (!loaded) {
      // Сброс до начального состояния, если данных ещё нет
      setHotspots([]);
      setObjects([]);
      setSelectedHotspotId(null);
      setSelectedObjectId(null);
    }
  }, [effectiveLocId, loadLocationData]);

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
    scene.add(grid);

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

    // Анимационный цикл
    let animId;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Обновление экранных координат 2D бейджей хотспотов
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
      transformControls.dispose();
      controls.dispose();
      renderer.dispose();

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
    if (!sceneRef.current) return;

    if (currentModelGroupRef.current) {
      sceneRef.current.remove(currentModelGroupRef.current);
      currentModelGroupRef.current = null;
    }

    if (activeModelUrl === 'procedural' || !activeModelUrl) return;

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
        showToast('✅ 3D Модель сцены загружена!');
      },
      undefined,
      (err) => {
        console.warn('Could not load 3D model, falling back to grid:', activeModelUrl, err);
      }
    );
  }, [activeModelUrl]);

  // =========================================================
  // 4. СИНХРОНИЗАЦИЯ ХОТСПОТОВ В СЦЕНЕ
  // =========================================================

  useEffect(() => {
    if (!sceneRef.current || !hotspotsGroupRef.current) return;
    const group = hotspotsGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

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
      hsWrapper.add(diamond);

      group.add(hsWrapper);
    });
  }, [hotspots, selectedHotspotId]);

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

      if (obj.modelType === 'custom_glb' && obj.modelBuffer) {
        try {
          loader.parse(
            obj.modelBuffer,
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
            (e) => console.error(e)
          );
        } catch (err) {
          console.error(err);
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
    if (transformControlsRef.current && transformControlsRef.current.axis) return;

    // Проверка на смещение мыши (чтобы клик не срабатывал при вращении камеры)
    const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
    if (dist > 6) return;

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
      modelUrl: activeModelUrl,
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
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.hotspots) setHotspots(parsed.hotspots);
        if (parsed.objects) setObjects(parsed.objects);
        if (parsed.camera) setCameraConfig(parsed.camera);
        if (parsed.modelUrl) setActiveModelUrl(parsed.modelUrl);
        showToast('📤 Данные успешно импортированы!');
      } catch (err) {
        showToast('⚠️ Ошибка чтения файла JSON!');
      }
    };
    reader.readAsText(file);
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
                          reader.onload = (ev) => {
                            const buffer = ev.target.result;
                            const newObj = {
                              id: `custom_glb_${Date.now()}`,
                              name: file.name.replace('.glb', ''),
                              modelType: 'custom_glb',
                              modelBuffer: buffer,
                              position: [0, 0, 0],
                              rotation: [0, 0, 0],
                              scale: [1, 1, 1],
                              isHotspot: false,
                            };
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
                        onClick={() => {
                          setObjects((prev) => prev.filter((o) => o.id !== selectedObject.id));
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
                  </select>
                </div>

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
              </div>
            )}
          </div>
        </aside>
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
