/**
 * Доступ к 3D-сценам локаций, которые рисует HotspotTool3D.
 *
 * Редактор пишет их в localStorage под ключом tgsamp_3d_hotspots_v1
 * в виде { [locKey]: { modelUrl, camera, hotspots, objects } }. Здесь
 * лежит чтение этих данных для игры: MapView решает, открывать ли
 * локацию как 3D-сцену, и какую модель туда показывать.
 *
 * Отдельный модуль нужен, потому что сам SceneViewer и редактор
 * работают с этим ключом каждый по-своему, а правило «сцена должна
 * считаться готовой» нужно одно и то же и в редакторе, и в игре.
 */

/** Ключ совпадает с HOTSPOT-хранилищем редактора и SceneViewer. */
const STORAGE_KEY = 'tgsamp_3d_hotspots_v1';

/**
 * Модель по умолчанию. Редактор подставляет её, когда модель не
 * задана, поэтому сама по себе она ничего не значит: наличие
 * именно этого пути не считается признаком готовой сцены.
 */
const DEFAULT_MODEL_URL = '/models/myscene.glb';

/**
 * Сцена без модели: только сетка и расставленные объекты.
 * Автор выбирает это сознательно, поэтому игре нужно отличать его от
 * «модель не задана» — иначе подставилась бы модель по умолчанию.
 */
const NO_SCENE_MODEL = 'none';

export interface Scene3DCamera {
  position?: [number, number, number];
  target?: [number, number, number];
  fov?: number;
}

export interface Scene3DHotspot {
  id: string;
  title?: string;
  action?: string;
  icon?: string;
  color?: string;
  position?: [number, number, number];
  size?: [number, number, number];
  subLocation?: string;
}

export interface Scene3DObject {
  id: string;
  name?: string;
  modelType?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  hotspotConfig?: { title?: string; action?: string; subLocation?: string };
  [key: string]: unknown;
}

export type InteriorMode = '2d' | '3d';

export interface Scene3DData {
  modelUrl: string;
  /**
   * Имя загруженной из файла модели. Сами байты в localStorage не
   * помещаются, они лежат в IndexedDB — по этому имени игра поймёт,
   * что грузить сцену нужно через sceneModelKey(), а не по URL.
   */
  customModelName?: string;
  /**
   * Какой интерьер показывать в игре. Если не задано — 'auto':
   * решение принимается по содержимому сцены (см. hasScene3D).
   */
  interiorMode?: InteriorMode | 'auto';
  camera: Scene3DCamera | null;
  hotspots: Scene3DHotspot[];
  objects: Scene3DObject[];
}

/**
 * Ключ подлокации — тот же, что у 2D-редактора (`parent__sub`).
 *
 * Разделитель обязан совпадать с тем, под которым редактор пишет
 * данные: подлокация ничем не отличается от обычной локации, у неё
 * просто своя картинка, свои хотспоты и свой выбор 2D/3D. Свой
 * формат ключа означал бы, что подлокация просто не находится.
 */
export function subLocationKey(parentId: string, subName: string): string {
  return `${parentId}__${subName}`;
}

function readAll(): Record<string, Partial<Scene3DData>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    // Битый JSON не должен ронять вход в локацию.
    console.warn('[3D] Не удалось прочитать сохранённые сцены:', e);
    return {};
  }
}

/** Данные сцены локации или null, если сцены нет. */
export function getScene3D(locationId: string | undefined): Scene3DData | null {
  if (!locationId) return null;
  const saved = readAll()[locationId];
  if (!saved) return null;

  return {
    modelUrl:
      typeof saved.modelUrl === 'string' && saved.modelUrl ? saved.modelUrl : DEFAULT_MODEL_URL,
    customModelName: typeof saved.customModelName === 'string' ? saved.customModelName : undefined,
    interiorMode: normalizeInteriorMode(saved.interiorMode),
    camera: saved.camera ?? null,
    hotspots: Array.isArray(saved.hotspots) ? saved.hotspots : [],
    objects: Array.isArray(saved.objects) ? saved.objects : [],
  };
}

function normalizeInteriorMode(value: unknown): InteriorMode | 'auto' {
  return value === '2d' || value === '3d' ? value : 'auto';
}

/** Записать переключатель 2D/3D для локации, не потеряв остальные поля. */
export function setInteriorMode(locationId: string, mode: InteriorMode | 'auto'): void {
  if (typeof localStorage === 'undefined') return;
  const all = readAll();
  const current = all[locationId] ?? { modelUrl: DEFAULT_MODEL_URL, hotspots: [], objects: [] };
  all[locationId] = { ...current, interiorMode: mode } as Partial<Scene3DData>;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[3D] Не удалось сохранить переключатель 2D/3D:', e);
  }
}

/** Текущее положение переключателя, включая неявное 'auto'. */
export function getInteriorMode(locationId: string | undefined): InteriorMode | 'auto' {
  return getScene3D(locationId)?.interiorMode ?? 'auto';
}

/** Сцена сознательно оставлена без модели сцены. */
export function isNoSceneModel(locationId: string | undefined): boolean {
  return getScene3D(locationId)?.modelUrl === NO_SCENE_MODEL;
}

/**
 * Показывать ли локацию как 3D-сцену.
 *
 * Явный выбор в 3D-редакторе решает всё. 'auto' (переключатель не
 * трогали) означает «по содержимому сцены» — только там нужны
 * эвристики.
 *
 * '3d' не проверяет, нарисовано ли что-нибудь: автор сам решил,
 * что интерьер трёхмерный, и показывать ему заглушку вместо сцены
 * нельзя. Если модель не загрузится, сцена покажет пустоту — это
 * уже понятная ошибка автора, а не тихая подмена 2D-картинкой,
 * из-за которой непонятно, куда он вообще настраивал интерьер.
 */
export function hasScene3D(locationId: string | undefined): boolean {
  const scene = getScene3D(locationId);
  if (!scene) return false;

  if (scene.interiorMode === '2d') return false;
  if (scene.interiorMode === '3d') return true;

  const hasContent = scene.hotspots.length > 0 || scene.objects.length > 0;
  const hasOwnModel = scene.modelUrl !== DEFAULT_MODEL_URL && !!scene.modelUrl;

  return hasContent || hasOwnModel;
}
