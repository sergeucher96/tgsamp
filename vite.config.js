import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

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
    }
  };
}

export default defineConfig({
  plugins: [react(), autoSaveHotspotsPlugin()],
  define: {
    'process.env': {},
  },
});