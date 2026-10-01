/**
 * Хранение бинарных моделей сцен в IndexedDB.
 *
 * Модель, загруженную пользователем из файла, нельзя положить в
 * localStorage: там хранится только строка. Сами байты живут здесь,
 * а в записи сцены остаётся лишь признак «модель кастомная» плюс
 * ключ, по которому её надо достать.
 *
 * Модуль общий для редактора и игры намеренно: если у них будут
 * свои копии этих функций, ключи разъедутся, и игра перестанет
 * находить модель, которую только что загрузили в редакторе.
 */

const DB_NAME = 'tgsamp_3d_models';
const DB_VERSION = 1;
const DB_STORE = 'buffers';

/** Префикс буферов отдельных объектов сцены. */
export const CUSTOM_OBJECT_PREFIX = 'obj_';

/**
 * Ключ буфера модели самой сцены.
 *
 * Раньше он был один на все локации, из-за чего шахта и автосалон
 * делили одну модель: загрузили для одной — увидели её у другой.
 * Поэтому ключ всегда дополняется id локации.
 */
export const sceneModelKey = (locId: string) => `scene_model__${locId}`;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBufferToDB(key: string, buffer: ArrayBuffer): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(buffer, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[3D Buffer DB] Ошибка сохранения:', e);
    return false;
  }
}

export async function loadBufferFromDB(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise<ArrayBuffer | null>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as ArrayBuffer) || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.error('[3D Buffer DB] Ошибка чтения:', e);
    return null;
  }
}

export async function deleteBufferFromDB(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
