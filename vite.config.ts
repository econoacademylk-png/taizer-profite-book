import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/api.ts';

dotenv.config();

function mongoApiPlugin(): Plugin {
  return {
    name: 'taizer-mongo-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          try {
            const handled = await handleApiRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('API middleware error:', err);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), mongoApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || path.resolve(), '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
