import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function autoSaveHotspotsPlugin() {
  let currentData = {};
  let savedHotspotsPath = '';

  const loadHotspotsFile = () => {
    savedHotspotsPath = path.resolve(process.cwd(), 'src/data/savedHotspots.json');
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
    console.log(`\x1b[32m[AutoSave] ✅ Файл src/data/savedHotspots.json успешно обновлен на диске!\x1b[0m`);
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
              if (allData) currentData = { ...currentData, ...allData };
              else if (id && payload) currentData[id] = payload;
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
                  if (insertResult.data) profile = insertResult.data;
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