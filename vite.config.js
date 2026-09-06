import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function autoSaveHotspotsPlugin() {
  return {
    name: 'auto-save-hotspots',
    configureServer(server) {
      server.middlewares.use('/api/save-hotspots', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { id, payload, allData } = JSON.parse(body);
              const filePath = path.resolve(process.cwd(), 'src/data/savedHotspots.json');
              
              let currentData = {};
              if (fs.existsSync(filePath)) {
                try {
                  currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                } catch (e) {
                  currentData = {};
                }
              }

              if (allData) {
                // Пакетная запись всех сохраненных локаций
                currentData = { ...currentData, ...allData };
              } else if (id && payload) {
                // Одиночная запись
                currentData[id] = payload;
              }

              fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');
              console.log(`\x1b[32m[AutoSave] ✅ Файл src/data/savedHotspots.json успешно обновлен на диске!\x1b[0m`);

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