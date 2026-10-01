// src/components/game/SceneViewer.tsx
// Полнофункциональный 3D Вьюпорт игрока (TG SAMP) с поддержкой хотспотов, 3D объектов и подлокаций
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh } from 'three';
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
import { buildProceduralProp } from '../../game/rendering/proceduralProps';
import { loadBufferFromDB, sceneModelKey } from '../../game/locations/sceneModels';
import { subLocationKey } from '../../game/locations/scene3d';
import { useTimeStore } from '../../stores/useTimeStore';
import { PHASE_LIGHT, type DayPhase } from '../../game/time/gameClock';
import {
  DEFAULT_CAMERA,
  withCameraDefaults,
  fitCameraForAspect,
  isMobileAspect,
  type CameraConfig,
  type ParallaxProfile,
} from '../../game/locations/sceneCamera';

const STORAGE_KEY = 'tgsamp_3d_hotspots_v1';

/** Модель по умолчанию, если у сцены нет своей. */
const DEFAULT_MODEL_URL = '/models/myscene.glb';

/** Сцена без модели сцены — значение общее с редактором. */
const NO_SCENE_MODEL = 'none';

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

/**
 * Перевести камеру на опорный кадр сцены с поправкой на экран.
 *
 * Одна функция на инициализацию, поворот экрана, смену сцены и
 * кнопку сброса. Пока эти случаи правились раздельно, поворот
 * телефона возвращал угол обзора к авторскому, и узкий экран снова
 * показывал вдвое меньше интерьера.
 */
function applyCameraFrameTo(
  config: CameraConfig,
  camera: any,
  controls: any,
  distanceScaleRef: { current: number },
  motionProfileRef: { current: ParallaxProfile }
) {
  const target = config.target || DEFAULT_CAMERA.target;
  const base = config.position || DEFAULT_CAMERA.position;

  const aspect = camera.aspect || 16 / 9;
  const fitted = fitCameraForAspect(config, aspect);
  distanceScaleRef.current = fitted.distanceScale;
  motionProfileRef.current = isMobileAspect(aspect) ? config.motion.mobile : config.motion.desktop;

  camera.fov = fitted.fov;
  camera.updateProjectionMatrix();

  camera.position.set(
    target[0] + (base[0] - target[0]) * fitted.distanceScale,
    target[1] + (base[1] - target[1]) * fitted.distanceScale,
    target[2] + (base[2] - target[2]) * fitted.distanceScale
  );
  camera.lookAt(target[0], target[1], target[2]);

  if (controls) {
    controls.target.set(target[0], target[1], target[2]);
    controls.update();
  }
}

/** Держать приближение в пределах, заданных профилем. */
function clampZoomFactor(profile: ParallaxProfile, value: number) {
  const min = profile.zoomMin ?? 0.7;
  const max = profile.zoomMax ?? 1.3;
  return Math.max(min, Math.min(max, value));
}

/** Расстояние между двумя точами касания — для щипка. */
function touchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Яркость солнца по фазам: ночью от солнца почти ничего не остаётся */
const PHASE_SUN: Record<DayPhase, number> = { morning: 0.9, day: 1.2, night: 0.25 };
/** Подсветка с холодной стороны. Ночью её роль играет луна */
const PHASE_FILL: Record<DayPhase, number> = { morning: 0.4, day: 0.4, night: 0.7 };
/** Фон сцены по фазам */
const PHASE_BG: Record<DayPhase, number> = { morning: 0x0d1018, day: 0x070b14, night: 0x03060f };

/** Временный цвет для подмешивания при переходе освещения */
const TMP_COLOR = new THREE.Color();

interface SceneLights {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  /**
   * Цвет фона хранится отдельным объектом и один раз отдаётся
   * сцене. Сам scene.background допускает и текстуру, поэтому у него
   * нет метода lerp, а подстраивать фон нужно каждый кадр.
   */
  background: THREE.Color;
  scene: THREE.Scene;
}

/** Поставить освещение сразу, без перехода. */
function setPhaseLighting(lights: SceneLights, phase: DayPhase) {
  const preset = PHASE_LIGHT[phase];
  lights.ambient.intensity = preset.ambient;
  lights.ambient.color.setHex(preset.color);
  lights.sun.intensity = PHASE_SUN[phase];
  lights.sun.color.setHex(preset.color);
  lights.fill.intensity = PHASE_FILL[phase];
  lights.fill.color.setHex(phase === 'night' ? 0x6f86d8 : 0x38bdf8);
  lights.background.setHex(PHASE_BG[phase]);
}

/**
 * Подтянуть освещение к фазе. Возвращает true, когда дошли.
 *
 * Ночью сцена не гаснет в чёрное: на чёрном фоне не видно ни пола,
 * ни мебели, и игрок решает, что сцена не загрузилась.
 */
function stepPhaseLighting(lights: SceneLights, phase: DayPhase, k: number) {
  const preset = PHASE_LIGHT[phase];
  lights.ambient.intensity += (preset.ambient - lights.ambient.intensity) * k;
  lights.ambient.color.lerp(TMP_COLOR.setHex(preset.color), k);
  lights.sun.intensity += (PHASE_SUN[phase] - lights.sun.intensity) * k;
  lights.sun.color.lerp(TMP_COLOR, k);
  lights.fill.intensity += (PHASE_FILL[phase] - lights.fill.intensity) * k;
  lights.background.lerp(TMP_COLOR.setHex(PHASE_BG[phase]), k);

  const done =
    Math.abs(preset.ambient - lights.ambient.intensity) < 0.005 &&
    Math.abs(PHASE_SUN[phase] - lights.sun.intensity) < 0.005 &&
    Math.abs(PHASE_FILL[phase] - lights.fill.intensity) < 0.005;
  if (done) setPhaseLighting(lights, phase);
  return done;
}

interface SceneViewerProps {
  url?: string;
  locationId?: string;
  onClose?: () => void;
  onOpenEditor?: () => void;
  /**
   * Куда уходит действие зоны. Тот же контракт, что у 2D-интерьера:
   * MapView отдаёт сюда свой обработчик, поэтому из 3D открываются
   * те же экраны, что и из 2D.
   */
  onAction?: (action: string, label: string, hotspot: Record<string, unknown>) => void;
  /**
   * Переход в подлокацию наружу. Карта решает, открыть её как 2D или
   * как 3D: у подлокации собственный переключатель, как у любой
   * локации, и в просмотрщике этого знания нет.
   */
  onEnterSubLocation?: (subName: string) => void;
  /**
   * Выход из подлокации в родительскую. Нужен, когда родитель
   * отрисован снаружи (2D-картинка), и вернуться надо туда.
   */
  onExitSubLocation?: () => void;
}

export default function SceneViewer({
  // Дефолт — не «экстерьер», а отсутствие модели: MapView передаёт
  // url={undefined} для локации без сцены, и дефолт пропса иначе
  // подставлял бы myscene.glb всем подряд.
  url = NO_SCENE_MODEL,
  locationId = 'showroom_ls',
  onClose,
  onOpenEditor,
  onAction,
  onEnterSubLocation,
  onExitSubLocation,
}: SceneViewerProps) {
  const [currentLocId, setCurrentLocId] = useState(locationId);
  const [activeSubLocation, setActiveSubLocation] = useState(null); // { parentId, subName }
  const [activeModelUrl, setActiveModelUrl] = useState(url || NO_SCENE_MODEL);
  // Модель, загруженная автором из файла: лежит в IndexedDB, здесь
  // только имя, по которому её надо оттуда достать.
  const [customModelName, setCustomModelName] = useState<string | undefined>(undefined);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(DEFAULT_CAMERA);
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
  // Соответствие «хотспот → объект в сцене»: поиск перебором по группе
  // внутри цикла кадра давал квадрат на каждом кадре.
  const hotspotObjectMapRef = useRef(new Map<string, THREE.Object3D>());
  // Размер холста из кэша, а не чтением в цикле кадра.
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  // Источники света сцены: их яркость и цвет зависят от времени суток.
  const lightsRef = useRef<SceneLights | null>(null);
  // Фаза, к которой свет подтягивается. Пока она равна свету,
  // подстройка прекращается и цикл перестаёт трогать освещение.
  const lightTargetRef = useRef<DayPhase | null>(null);

  // Параллакс: указатель в нормализованных координатах -1..1 и
  // профиль движения, выбранный под соотношение сторон экрана.
  // В refs, потому что анимационный цикл читает их каждый кадр и
  // не должен перезапускаться на каждый двиг мыши.
  const pointerRef = useRef({ x: 0, y: 0 });
  const motionProfileRef = useRef<ParallaxProfile>(DEFAULT_CAMERA.motion.desktop);
  // Приближение игрока относительно опорной точки, 1 — авторский кадр.
  // Раньше пределы zoomMin/zoomMax были в настройках, но к камере не
  // подключались: колесо мыши и щипок не двигали ничего.
  const zoomRef = useRef(1);
  // Расстояние между пальцами в начале щипка, чтобы считать изменение
  // относительно предыдущего кадра, а не рывком прыгать на месте.
  const pinchDistanceRef = useRef(0);
  const cameraConfigRef = useRef<CameraConfig>(cameraConfig);
  cameraConfigRef.current = cameraConfig;
  // Потянуть камеру назад на узких экранах, чтобы не упираться в
  // предел угла обзора.
  const distanceScaleRef = useRef(1);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Вычисляемый идентификатор локации/подлокации.
  // Разделитель подлокации — общий с редактором, иначе игра не найдёт
  // ни модель, ни хотспоты, нарисованные для подлокации.
  const effectiveLocId = activeSubLocation
    ? subLocationKey(activeSubLocation.parentId, activeSubLocation.subName)
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
          // Загруженная из файла модель помечена именем: байты лежат
          // в IndexedDB, и по одному modelUrl их не достать.
          setCustomModelName(typeof saved.customModelName === 'string' ? saved.customModelName : undefined);
          if (saved.camera) setCameraConfig(withCameraDefaults(saved.camera));
          if (Array.isArray(saved.hotspots)) setHotspots(saved.hotspots);
          if (Array.isArray(saved.objects)) setObjects(saved.objects);
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not read saved scene data:', e);
    }
    // Данных нет: интерьер ещё не нарисован. Раньше здесь подставлялась
    // зона «Вход в автосалон», и она появлялась в любой локации без
    // сцены — в шахте предлагали войти в автосалон.
    setCustomModelName(undefined);
    setActiveModelUrl(NO_SCENE_MODEL);
    setHotspots([]);
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
    // Цвет фона подставляется вместе со светом по фазе суток,
    // поэтому здесь его не задаём.
    sceneRef.current = scene;

    // Опорный кадр автора задан для 16:9. На узком экране угол
    // обзора расширяется, а остаток добирается отъездом — иначе
    // телефон увидел бы вдвое меньше интерьера, чем монитор.
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(cameraConfig.fov || 48, aspect, 0.1, 800);
    cameraRef.current = camera;

    const target = cameraConfig.target || DEFAULT_CAMERA.target;
    controlsRef.current = null;

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

    // Свет подстраивается под время суток. Фаза приходит из стора
    // времени, то есть одинакова у всех игроков: у кого-то сцена
    // освещена как в полдень, у кого-то как в сумерках.
    const background = new THREE.Color(0x070b14);
    scene.background = background;
    lightsRef.current = { ambient: ambientLight, sun: sunLight, fill: blueFill, background, scene };

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

    // Опорный кадр с поправкой на экран — после создания контроллера,
    // чтобы тот сразу знал цель вращения.
    applyCameraFrameTo(cameraConfig, camera, controls, distanceScaleRef, motionProfileRef);

    // Стартовое освещение — по текущей фазе, иначе сцена мигнёт
    // белым, пока стор времени ещё не ответил.
    if (lightsRef.current) {
      setPhaseLighting(lightsRef.current, useTimeStore.getState().phase);
    }

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
    // Опорная позиция камеры и её базовая ориентация. От них
    // считается параллакс, иначе поворот накапливался бы кадр за
    // кадром и камера уезжала.
    const baseCamPos = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion();
    const targetQuat = new THREE.Quaternion();
    const deltaQuat = new THREE.Quaternion();
    const parallaxEuler = new THREE.Euler();
    const rightVec = new THREE.Vector3();
    const upVec = new THREE.Vector3();
    const desiredPos = new THREE.Vector3();
    const lookHelper = new THREE.Object3D();

    const applyCameraFrame = () => {
      const config = cameraConfigRef.current;
      const target = config.target || DEFAULT_CAMERA.target;
      const base = config.position || DEFAULT_CAMERA.position;
      const scale = distanceScaleRef.current * zoomRef.current;

      baseCamPos.set(
        target[0] + (base[0] - target[0]) * scale,
        target[1] + (base[1] - target[1]) * scale,
        target[2] + (base[2] - target[2]) * scale
      );

      lookHelper.position.copy(baseCamPos);
      lookHelper.up.set(0, 1, 0);
      lookHelper.lookAt(target[0], target[1], target[2]);
      baseQuat.copy(lookHelper.quaternion);
    };

    // Опорный кадр применяется заново: смена сцены, поворот экрана
    // и сброс кнопкой должны возвращать камеру к опорной точке.
    applyCameraFrame();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
      // Скрытая вкладка: сцену никто не видит, а рендер идёт.
      if (document.hidden) return;

      // Подстройка света под время суток идёт здесь, в общем цикле:
      // отдельный requestAnimationFrame ради света крутился бы
      // без остановки даже при полностью устоявшемся свете.
      if (lightTargetRef.current && lightsRef.current) {
        if (stepPhaseLighting(lightsRef.current, lightTargetRef.current, 0.05)) {
          lightTargetRef.current = null;
        }
      }

      const camera = cameraRef.current;
      const profile = motionProfileRef.current;
      const controls = controlsRef.current;

      // Базовая точка пересчитывается каждый кадр, а не только при
      // смене сцены: игрок крутит колесо или щипает экран в любой
      // момент. Ориентацию при этом пересчитывать незачем — при
      // отъезде вдоль того же луча взгляд остаётся прежним.
      applyCameraFrame();

      // Параллакс: камера следит за указателем в пределах, заданных
      // профилем. Раньше эта настройка жила только в редакторе и до
      // игроков не доходила вовсе.
      if (controls) {
        if (profile.enabled) {
          controls.enabled = false;

          const yaw = ((profile.yawDegrees * Math.PI) / 180) * -pointerRef.current.x;
          const pitch = ((profile.pitchDegrees * Math.PI) / 180) * pointerRef.current.y;
          const roll = -pointerRef.current.x * 0.015;

          parallaxEuler.set(pitch, yaw, roll, 'YXZ');
          deltaQuat.setFromEuler(parallaxEuler);
          targetQuat.copy(baseQuat).multiply(deltaQuat);

          const shift = profile.positionShift;
          rightVec.set(1, 0, 0).applyQuaternion(baseQuat);
          upVec.set(0, 1, 0).applyQuaternion(baseQuat);
          desiredPos
            .copy(baseCamPos)
            .addScaledVector(rightVec, pointerRef.current.x * shift)
            .addScaledVector(upVec, pointerRef.current.y * shift * 0.5);

          const smooth = Math.max(0.01, Math.min(1, profile.smoothness));
          camera.position.lerp(desiredPos, smooth);
          camera.quaternion.slerp(targetQuat, smooth);
        } else {
          controls.enabled = true;
          controls.update();
        }
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
        // Размеры берём из кэша: чтение clientWidth в цикле кадра
        // заставляет браузер пересчитывать вёрстку 60 раз в секунду.
        const w = viewportSizeRef.current.width;
        const h = viewportSizeRef.current.height;
        if (w === 0 || h === 0) return;

        hotspotDomRefs.current.forEach((domEl, hsId) => {
          const obj = hotspotObjectMapRef.current.get(hsId);
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
      viewportSizeRef.current = { width: w, height: h };
      cameraRef.current.aspect = w / h;
      rendererRef.current.setSize(w, h);
      // Поворот телефона меняет соотношение сторон, поэтому кадр и
      // профиль движения пересчитываются заново. Без этого узкий
      // экран получал угол обзора, заданный для монитора.
      applyCameraFrameTo(
        cameraConfigRef.current,
        cameraRef.current,
        controlsRef.current,
        distanceScaleRef,
        motionProfileRef
      );
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    // Наблюдатель за элементом, а не только за окном: панель браузера
    // на телефоне меняет размер холста, не вызывая resize у окна.
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
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
    applyCameraFrameTo(cameraConfig, cameraRef.current, controlsRef.current, distanceScaleRef, motionProfileRef);
  }, [cameraConfig]);

  // 4. Загрузка модели сцены
  //
  // Модель бывает двух видов: обычная, лежащая по URL в public/models,
  // и загруженная автором из файла — её байты лежат в IndexedDB.
  // Раньше второй случай не обрабатывался вовсе, и игрок видел вместо
  // сцены модель по умолчанию.
  useEffect(() => {
    if (!sceneRef.current) return;
    let cancelled = false;

    if (currentModelGroupRef.current) {
      sceneRef.current.remove(currentModelGroupRef.current);
      currentModelGroupRef.current.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      currentModelGroupRef.current = null;
    }

    setIsLoadingModel(true);
    const loader = new GLTFLoader();

    // Автор оставил интерьер без модели сцены: показываем сетку и
    // объекты, а не подставляем модель по умолчанию.
    if (activeModelUrl === NO_SCENE_MODEL) {
      setIsLoadingModel(false);
      return () => {
        cancelled = true;
      };
    }

    const addModel = (model: THREE.Object3D) => {
      if (cancelled || !sceneRef.current) return;

      model.traverse((child) => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Модель, загруженная из файла, ставится на землю по центру
      // своей геометрии. Без этого она уезжает под пол или вбок
      // относительно того, что автор расставил в редакторе.
      const bbox = new THREE.Box3().setFromObject(model);
      if (!bbox.isEmpty() && Number.isFinite(bbox.min.y)) {
        const center = bbox.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= bbox.min.y;
        model.position.z -= center.z;
      }

      sceneRef.current.add(model);
      currentModelGroupRef.current = model;
      setIsLoadingModel(false);
    };

    const onError = (err) => {
      if (cancelled) return;
      console.warn('[3D] Не удалось загрузить модель сцены:', activeModelUrl, err);
      setIsLoadingModel(false);
    };

    if (customModelName) {
      // Сначала пробуем кастомную модель этой локации, и только потом
      // обычную: потерянный буфер не должен превращать интерьер в пустоту.
      loadBufferFromDB(sceneModelKey(effectiveLocId)).then((buffer) => {
        if (cancelled) return;
        if (buffer) {
          loader.parse(buffer, '', (gltf) => addModel(gltf.scene), onError);
          return;
        }
        console.warn(
          `[3D] Модель «${customModelName}» для ${effectiveLocId} не найдена в IndexedDB, ` +
          'показываю модель по умолчанию'
        );
        loader.load(DEFAULT_MODEL_URL, (gltf) => addModel(gltf.scene), undefined, onError);
      });
    } else {
      loader.load(activeModelUrl, (gltf) => addModel(gltf.scene), undefined, onError);
    }

    return () => {
      cancelled = true;
    };
  }, [activeModelUrl, customModelName, effectiveLocId]);

  // Смена фазы суток. Значения не ставятся сразу, а плавно
  // подтягиваются в анимационном цикле: рывок из белого света в
  // темноту за один кадр выглядел бы как поломка сцены.
  useEffect(() => {
    return useTimeStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) lightTargetRef.current = state.phase;
    });
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !hotspotsGroupRef.current) return;
    const group = hotspotsGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    // Словарь собираем здесь, а не ищем по группе каждый кадр:
    // поиск перебором внутри цикла по хотспотам давал квадрат
    // на каждом кадре анимации.
    hotspotObjectMapRef.current.clear();

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
      hotspotObjectMapRef.current.set(hs.id, hsWrapper);
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

  /**
   * Клик по зоне или по интерактивному пропу.
   *
   * Переход в подлокацию проверяется первым: это перемещение внутри
   * самой сцены, а не игровое действие, поэтому он работает даже
   * когда сцена открыта из игры.
   *
   * Дальше — два режима. Если игра передала onAction, действие уходит
   * в неё, и открывается тот же экран, что и из 2D-интерьера. Если
   * обработчика нет, показываем информационную панель: в этом режиме
   * просмотрщик работает витриной из админ-панели, и вызывать игровые
   * экраны ему некуда.
   */
  const openInteraction = (item) => {
    if (!item) return;

    if (item.subLocation) {
      // Подлокация — самостоятельная локация со своим 2D/3D, поэтому
      // решать, чем её открывать, должен вызывающий: в 3D-сцену, в
      // 2D-картинку или в другую 3D-сцену. Просмотрщик без обработчика
      // (витрина из админ-панели) открывает подлокацию сам.
      if (onEnterSubLocation) {
        onEnterSubLocation(item.subLocation);
        return;
      }
      setActiveSubLocation({
        parentId: activeSubLocation ? activeSubLocation.parentId : currentLocId,
        subName: item.subLocation,
      });
      setActiveInteraction(null);
      showToast(`🚀 Переход в ${item.subLocation}...`);
      return;
    }

    if (onAction) {
      onAction(item.action || 'enter', item.title || 'Зона', item);
      return;
    }

    setActiveInteraction(item);
  };

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
          if (h) openInteraction(h);
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
            openInteraction({
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
    if (!cameraRef.current) return;
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
    // К авторскому кадру: не только наклон, но и приближение.
    zoomRef.current = 1;
    applyCameraFrameTo(
      cameraConfig,
      cameraRef.current,
      controlsRef.current,
      distanceScaleRef,
      motionProfileRef
    );
    showToast('🎥 Ракурс камеры сброшен к исходному');
  };

  // Приближение колесом мыши. Слушатель ставится вручную, а не через
  // onWheel: React вешает колесо пассивно, и preventDefault там
  // игнорируется — страница уезжала бы вместо камеры.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const profile = motionProfileRef.current;
      const step = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      zoomRef.current = clampZoomFactor(profile, zoomRef.current * step);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

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
                // Родитель может быть 2D-картинкой, тогда выход из
                // подлокации ведёт карта, а не сам просмотрщик.
                if (onExitSubLocation) {
                  onExitSubLocation();
                  return;
                }
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
          // Параллакс: в нормализованные -1..1 относительно центра
          // холста. Без этого камера в игре не реагировала на курсор
          // вообще — настройка жила только в предпросмотре редактора.
          onPointerMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect || rect.width === 0 || rect.height === 0) return;
            pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointerRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          }}
          // Уход указателя возвращает кадр в опорное положение, иначе
          // камера застывала бы под последним наклоном.
          onPointerLeave={() => {
            pointerRef.current.x = 0;
            pointerRef.current.y = 0;
          }}
          // Щипок двумя пальцами на телефоне.
          onTouchStart={(e) => {
            if (e.touches.length !== 2) {
              pinchDistanceRef.current = 0;
              return;
            }
            pinchDistanceRef.current = touchDistance(e.touches[0], e.touches[1]);
          }}
          onTouchMove={(e) => {
            if (e.touches.length !== 2) return;
            const start = pinchDistanceRef.current;
            if (!start) return;
            const now = touchDistance(e.touches[0], e.touches[1]);
            if (!now) return;
            const profile = motionProfileRef.current;
            zoomRef.current = clampZoomFactor(profile, zoomRef.current * (now / start));
            pinchDistanceRef.current = now;
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
                  openInteraction(hs);
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

      {/* Нижняя подсказка для игрока. При включённом параллаксе камеру
          ведёт указатель, поэтому перетаскивание не упоминается: автор
          может выключить параллакс, и тогда осмотр идёт перетаскиванием. */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-5 py-2.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/80 text-center shadow-2xl">
          <p className="text-[11px] font-bold text-slate-300">
            {motionProfileRef.current.enabled
              ? '🖱️ Наведи на сцену — камера последует • 🔍 Колесо или щипок приближают'
              : '🖱️ Драг для осмотра • 🔍 Колесо или щипок приближают'}
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
