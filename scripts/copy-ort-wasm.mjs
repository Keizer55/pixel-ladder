/**
 * copy-ort-wasm.mjs
 *
 * Copies the ONNX Runtime Web WASM (and .mjs glue) files from node_modules
 * into public/ort/ so they are served from the same origin as the app.
 *
 * This avoids cross-origin failures in production environments (e.g. Coolify)
 * where strict COEP/CORP headers prevent loading .mjs modules from a CDN.
 *
 * Run automatically via the "prebuild" npm script before every `npm run build`.
 */

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC_DIR = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const DST_DIR = join(ROOT, 'public', 'ort');

// Only the files needed by the `onnxruntime-web/wasm` execution provider.
// The jsep/asyncify .mjs glue files are NOT needed (we use the wasm-only package).
const FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  // jsep .wasm included as a safety net so the runtime doesn't 404 if it probes
  'ort-wasm-simd-threaded.jsep.wasm',
];

mkdirSync(DST_DIR, { recursive: true });

for (const file of FILES) {
  const src = join(SRC_DIR, file);
  const dst = join(DST_DIR, file);
  if (!existsSync(src)) {
    console.warn(`[copy-ort-wasm] WARNING: source not found: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  console.log(`[copy-ort-wasm] Copied ${file} → public/ort/`);
}

console.log('[copy-ort-wasm] Done.');
