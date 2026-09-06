import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Плагин для автоматического сохранения хотспотов на диск при работе на localhost
function autoSaveHotspotsPlugin() {
  return {
    name: 'auto-save-hotspots',
    configureServer(server) {
      server.middlewares.use('/api/save-hotspots', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { id, payload } = JSON.parse(body);
              const filePath = path.resolve(process.cwd(), 'src/data/savedHotspots.json');
              
              let currentData = {};
              if (fs.existsSync(filePath)) {
                try {
                  currentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                } catch (e) {
                  currentData = {};
                }
              }

              // Записываем обновленные хотспоты и картинку
              currentData[id] = payload;
              fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
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