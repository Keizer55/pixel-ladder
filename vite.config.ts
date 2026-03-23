import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Serves /ort/* files directly from node_modules in dev, bypassing Vite's
 * module transform pipeline. Without this, Vite sees the dynamic import() of
 * ort-wasm-simd-threaded.mjs (which ONNX Runtime performs at runtime) as an ES
 * module import of a file that lives in /public, and throws an error.
 *
 * In production the same files are served as plain static assets from
 * public/ort/ by nginx/Caddy — no Vite involvement there.
 */
function ortWasmDevServerPlugin() {
  return {
    name: 'serve-ort-wasm-dev',
    configureServer(server: import('vite').ViteDevServer) {
      const ORT_DIST = path.resolve(
        __dirname,
        'node_modules/onnxruntime-web/dist'
      );
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/ort/')) return next();

        const filename = url.slice('/ort/'.length).split('?')[0];
        const filePath = path.join(ORT_DIST, filename);

        if (!existsSync(filePath)) return next();

        const ext = path.extname(filename);
        const contentType =
          ext === '.wasm'
            ? 'application/wasm'
            : 'text/javascript; charset=utf-8';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'max-age=3600');
        createReadStream(filePath).pipe(res as NodeJS.WritableStream);
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), ortWasmDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
