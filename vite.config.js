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
              if (parsed.initData !== 'DEV_DEBUG') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Telegram auth only works when deployed.' }));
                return;
              }

              // Use client Supabase to find/create real debug profile
              const env = loadEnv('development', process.cwd(), ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
              const supabaseUrl = env.VITE_SUPABASE_URL || 'https://rzxkajmrzxvnzbqhluoe.supabase.co';
              const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
              if (!supabaseAnonKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'VITE_SUPABASE_ANON_KEY is required in .env file' }));
                return;
              }
              const supabase = createClient(supabaseUrl, supabaseAnonKey);

              // Find existing debug player
              let { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('telegram_id', 'DEBUG_PLAYER_1')
                .maybeSingle();

              // Create if not exists
              if (!profile) {
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert([{
                    telegram_id: 'DEBUG_PLAYER_1',
                    first_name: 'DevTester',
                    last_name: '',
                    username: null,
                    money: 50000,
                    inv_slots: 12,
                    bank_balance: 0,
                    deposit_balance: 0,
                    energy: 100,
                    hp: 100,
                    hunger: 100,
                    thirst: 100,
                    rotation: 0,
                    registered_at: new Date().toISOString()
                  }])
                  .select()
                  .single();
                if (!createError) {
                  profile = newProfile;
                }
              }

              if (!profile) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to find or create debug profile' }));
                return;
              }

              // Load related data
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