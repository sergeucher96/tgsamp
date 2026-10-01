import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function autoSaveHotspotsPlugin() {
  let currentData = {};
  let savedHotspotsPath = '';
  let currentScenes3D = {};
  let savedScenes3DPath = '';

  // Куда выкладываются картинки, загруженные в редакторе.
  const publicLocationsDir = path.resolve(process.cwd(), 'public/locations');

  const DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,(.+)$/;
  // Ключи — подтип из data:image/<подтип>, без префикса image/.
  const EXT_BY_SUBTYPE = {
    png: 'png',
    jpeg: 'jpg',
    jpg: 'jpg',
    webp: 'webp',
    gif: 'gif',
    'svg+xml': 'svg',
  };

  /**
   * Имя файла из id локации.
   *
   * id приходит из тела запроса, поэтому всё, кроме букв, цифр,
   * дефиса и подчёркивания, заменяется: иначе в пути оказались бы
   * слеши и «..».
   */
  const fileBaseFor = (id) => {
    const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60).replace(/^_+|_+$/g, '');
    return safe || 'location';
  };

  /**
   * Сохраняет встроенную картинку файлом и возвращает публичный путь.
   *
   * Зачем: редактор шлёт картинку как data:image прямо в JSON. Такая
   * строка — это сотни килобайт двоичного мусора в исходнике: она
   * едет в бандле всем игрокам, diff становится нечитаемым, а файл
   * невозможно посмотреть глазами. Картинка лежит в public/locations
   * файлом, в JSON остаётся короткий путь.
   *
   * Имя собирается из id локации, поэтому повторное сохранение
   * перезаписывает тот же файл, а не плодит мусор.
   */
  const persistEmbeddedImage = (value, fileBase) => {
    if (typeof value !== 'string') return value;
    const match = DATA_IMAGE_RE.exec(value);
    if (!match) return value;

    const [, subtype, base64] = match;
    const ext = EXT_BY_SUBTYPE[subtype] || 'img';
    const fileName = `${fileBase}.${ext}`;

    try {
      fs.mkdirSync(publicLocationsDir, { recursive: true });
      fs.writeFileSync(path.join(publicLocationsDir, fileName), Buffer.from(base64, 'base64'));
      console.log(`\x1b[32m[AutoSave] 🖼️  Картинка выложена файлом: public/locations/${fileName}\x1b[0m`);
      return `/locations/${fileName}`;
    } catch (err) {
      // Не теряем картинку из-за ошибки записи: оставляем как есть,
      // интерьер продолжит работать, просто снова внутри JSON.
      console.error('[AutoSave] Не удалось сохранить картинку файлом:', err);
      return value;
    }
  };

  /** Прогоняет запись локации через persistEmbeddedImage. */
  const persistEntryImages = (entry, id) => {
    if (!entry || typeof entry !== 'object') return entry;

    const next = { ...entry };
    if (typeof next.default === 'string') next.default = persistEmbeddedImage(next.default, fileBaseFor(id));
    if (typeof next.image === 'string') next.image = persistEmbeddedImage(next.image, `${fileBaseFor(id)}_sub`);
    if (Array.isArray(next.images)) {
      next.images = next.images.map((img, index) =>
        img && typeof img.src === 'string'
          ? { ...img, src: persistEmbeddedImage(img.src, `${fileBaseFor(id)}_${index + 1}`) }
          : img
      );
    }
    return next;
  };

  const loadHotspotsFile = () => {
    savedHotspotsPath = path.resolve(process.cwd(), 'src/game/locations/savedHotspots.json');
    if (fs.existsSync(savedHotspotsPath)) {
      try {
        currentData = JSON.parse(fs.readFileSync(savedHotspotsPath, 'utf-8'));
      } catch (e) {
        currentData = {};
      }
    }
  };

  const writeHotspotsFile = () => {
    if (!savedHotspotsPath) return;
    fs.writeFileSync(savedHotspotsPath, JSON.stringify(currentData, null, 2), 'utf-8');
    console.log(`\x1b[32m[AutoSave] ✅ Файл src/game/locations/savedHotspots.json успешно обновлен на диске!\x1b[0m`);
  };

  // 3D-сцены живут в отдельном файле: держать их в savedHotspots.json
  // нельзя, там лежат 2D-интерьеры, и запись сцены затирала бы
  // картинку с хотспотами у локации, нарисованной в 2D-редакторе.
  const loadScenes3DFile = () => {
    savedScenes3DPath = path.resolve(process.cwd(), 'src/game/locations/savedScenes3D.json');
    if (fs.existsSync(savedScenes3DPath)) {
      try {
        currentScenes3D = JSON.parse(fs.readFileSync(savedScenes3DPath, 'utf-8'));
      } catch (e) {
        currentScenes3D = {};
      }
    } else {
      fs.writeFileSync(savedScenes3DPath, '{}\n', 'utf-8');
    }
  };

  const writeScenes3DFile = () => {
    if (!savedScenes3DPath) return;
    fs.writeFileSync(savedScenes3DPath, JSON.stringify(currentScenes3D, null, 2), 'utf-8');
    console.log(`\x1b[32m[AutoSave] ✅ Файл src/game/locations/savedScenes3D.json успешно обновлен на диске!\x1b[0m`);
  };

  return {
    name: 'auto-save-hotspots',
    configureServer(server) {
      // Save hotspots
      server.middlewares.use('/api/save-hotspots', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              loadHotspotsFile();
              const { id, payload, allData } = JSON.parse(body);
              // Картинки из редактора приходят как data:image — выкладываем
              // их файлами, в JSON оставляем пути.
              if (allData) {
                const persisted = {};
                for (const [entryId, entry] of Object.entries(allData)) {
                  persisted[entryId] = persistEntryImages(entry, entryId);
                }
                currentData = { ...currentData, ...persisted };
              } else if (id && payload) {
                currentData[id] = persistEntryImages(payload, id);
              }
              writeHotspotsFile();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('[AutoSave Error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });

      // Save 3D scenes (отдельный файл, чтобы не затирать 2D-интерьеры)
      server.middlewares.use('/api/save-3d-scenes', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              loadScenes3DFile();
              const { id, payload, allData } = JSON.parse(body);
              if (allData) currentScenes3D = { ...currentScenes3D, ...allData };
              else if (id && payload) currentScenes3D[id] = payload;
              writeScenes3DFile();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('[AutoSave 3D Error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });

      // Save location coordinates & icons
      server.middlewares.use('/api/save-locations', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              loadHotspotsFile();
              const { coordinates, icons } = JSON.parse(body);
              if (coordinates) currentData.location_coordinates = coordinates;
              if (icons) currentData.location_icons = icons;
              writeHotspotsFile();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('[AutoSave Error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });

      // Auth endpoint for local development - uses real Supabase
      server.middlewares.use('/api/auth', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body);
              const env = loadEnv('development', process.cwd(), '');
              const supabaseUrl = env.VITE_SUPABASE_URL || 'https://rzxkajmrzxvnzbqhluoe.supabase.co';
              const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';
              const supabase = createClient(supabaseUrl, supabaseAnonKey);

              let profile;

              if (parsed.initData === 'DEV_DEBUG') {
                // Dev mode in regular browser - use test profile
                ({ data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('telegram_id', 'DEBUG_PLAYER_1')
                  .maybeSingle());

                if (!profile) {
                  const insertResult = await supabase
                    .from('profiles')
                    .insert([{
                      telegram_id: 'DEBUG_PLAYER_1',
                      first_name: 'DevTester',
                      money: 50000,
                      inv_slots: 12,
                      bank_balance: 0,
                      deposit_balance: 0,
                      energy: 100,
                      hp: 100,
                      hunger: 100,
                      thirst: 100,
                      registered_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                  // Ошибку вставки обязаны показать: раньше её глотали,
                  // и в консоли появлялся безликий «Failed to create
                  // debug profile» — RLS на profiles или отсутствующая
                  // NOT NULL-колонка выглядели одинаково.
                  if (insertResult.error) {
                    console.error('[Auth DEV] Не удалось создать отладочный профиль:', insertResult.error.message);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      error: 'Failed to create debug profile',
                      detail: insertResult.error.message,
                      code: insertResult.error.code
                    }));
                    return;
                  }

                  profile = insertResult.data;
                }

                if (!profile) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Failed to create debug profile' }));
                  return;
                }

                const [skillsRes, licensesRes, vehicleRes] = await Promise.all([
                  supabase.from('player_skills').select('*').eq('player_id', profile.id),
                  supabase.from('player_licenses').select('*').eq('player_id', profile.id),
                  supabase.from('vehicles').select('*').eq('owner_id', profile.id).eq('is_active', true).maybeSingle()
                ]);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  profile,
                  skills: skillsRes.data || [],
                  licenses: licensesRes.data || [],
                  activeVehicle: vehicleRes.data || null
                }));
              } else if (parsed.initData) {
                // Real Telegram initData - parse directly (dev mode, skip HMAC)
                const params = new URLSearchParams(parsed.initData);
                const tgUser = JSON.parse(params.get('user') || '{}');
                const tgId = tgUser.id?.toString();
                const authDate = Number(params.get('auth_date'));
                const now = Math.floor(Date.now() / 1000);

                if (authDate && (now - authDate > 86400)) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Authentication data expired' }));
                  return;
                }

                if (!tgId) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'User ID not found in initData' }));
                  return;
                }

                ({ data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('telegram_id', tgId)
                  .maybeSingle());

                if (!profile) {
                  const insertResult = await supabase
                    .from('profiles')
                    .insert([{
                      telegram_id: tgId,
                      first_name: tgUser.first_name || 'Скиталец',
                      last_name: tgUser.last_name || '',
                      username: tgUser.username || null,
                      money: 50000,
                      inv_slots: 12,
                      bank_balance: 0,
                      deposit_balance: 0,
                      energy: 100,
                      hp: 100,
                      hunger: 100,
                      thirst: 100,
                      registered_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                  if (insertResult.data) profile = insertResult.data;
                }

                if (!profile) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Failed to create profile' }));
                  return;
                }

                const [skillsRes, licensesRes, vehicleRes] = await Promise.all([
                  supabase.from('player_skills').select('*').eq('player_id', profile.id),
                  supabase.from('player_licenses').select('*').eq('player_id', profile.id),
                  supabase.from('vehicles').select('*').eq('owner_id', profile.id).eq('is_active', true).maybeSingle()
                ]);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  profile,
                  skills: skillsRes.data || [],
                  licenses: licensesRes.data || [],
                  activeVehicle: vehicleRes.data || null
                }));
              } else {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing initData' }));
              }
            } catch (err) {
              console.error('[Auth Error]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), autoSaveHotspotsPlugin()],
  define: {
    'process.env': {},
  },
});