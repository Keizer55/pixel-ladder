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

// WASM binaries and the JS glue needed by `onnxruntime-web/wasm`.
const FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.asyncify.wasm',
  // jsep .wasm: safety net so the runtime doesn't 404 if it probes
  'ort-wasm-simd-threaded.jsep.wasm',
];

// The .mjs glue file must also be available as .js because some nginx
// configurations (e.g. Coolify's default) don't include 'mjs' in their
// MIME types, so they serve it as application/octet-stream, which causes
// the browser to reject the dynamic import(). We configure wasmPaths to
// request the .js copy instead.
const MJS_GLUE = 'ort-wasm-simd-threaded.mjs';

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

// Copy .mjs glue as both .mjs and .js
const mjsSrc = join(SRC_DIR, MJS_GLUE);
if (existsSync(mjsSrc)) {
  copyFileSync(mjsSrc, join(DST_DIR, MJS_GLUE));
  console.log(`[copy-ort-wasm] Copied ${MJS_GLUE} → public/ort/`);
  const jsAlias = MJS_GLUE.replace('.mjs', '.js');
  copyFileSync(mjsSrc, join(DST_DIR, jsAlias));
  console.log(`[copy-ort-wasm] Copied ${MJS_GLUE} → public/ort/${jsAlias} (nginx .js alias)`);
} else {
  console.warn(`[copy-ort-wasm] WARNING: source not found: ${mjsSrc}`);
}

console.log('[copy-ort-wasm] Done.');
