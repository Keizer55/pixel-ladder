import * as ort from 'onnxruntime-web';

// Self-host WASM files from /ort/ to avoid cross-origin issues in production
// (CDN loading fails when COEP/CORP headers are enforced by the server)
ort.env.wasm.wasmPaths = '/ort/';

// Disable JSEP (WebGPU/WebNN) backend — we only need plain wasm.
// This prevents the runtime from trying to dynamically import jsep.mjs,
// which breaks in environments with strict cross-origin security headers.
ort.env.wasm.numThreads = 1; // safe default; threads need SharedArrayBuffer


self.onmessage = async (e) => {
  const { imageData, width, height, modelType } = e.data;

  try {
    let modelPath = '';
    let scale = 2;

    if (modelType === 'x2') {
      modelPath = '/RealESRGAN_x2plus.onnx';
      scale = 2;
    } else if (modelType === 'x4') {
      modelPath = '/RealESRGAN_x4plus.onnx';
      scale = 4;
    } else if (modelType === 'x4-anime') {
      modelPath = '/RealESRGAN_x4plus_anime_6B.onnx';
      scale = 4;
    }

    self.postMessage({ type: 'progress', progress: 10, message: `Loading model ${modelPath}...` });

    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
    });

    self.postMessage({ type: 'progress', progress: 25, message: 'Model loaded. Processing tiles...' });

    // All our ONNX models expect float32 input (fp16 weight storage is internal)
    const inputType = 'float32';

    const outWidth = width * scale;
    const outHeight = height * scale;

    // Model-specific tile config
    // fixedSize: model ONLY accepts exactly this input dimension (null = dynamic)
    const tileConfig = {
      'x2':       { tileSize: 64,  overlap: 0, fixedSize: 64  },
      'x4':       { tileSize: 128, overlap: 8, fixedSize: null },
      'x4-anime': { tileSize: 128, overlap: 8, fixedSize: null },
    };
    const cfg = tileConfig[modelType] || { tileSize: 128, overlap: 8, fixedSize: null };
    const { tileSize: TILE_SIZE, overlap: TILE_OVERLAP, fixedSize: FIXED_INPUT } = cfg;

    const tilesX = Math.ceil(width  / TILE_SIZE);
    const tilesY = Math.ceil(height / TILE_SIZE);
    const totalTiles = tilesX * tilesY;
    let processedTiles = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        // Tile source coords with overlap, clamped to image bounds
        const x0 = Math.max(0, tx * TILE_SIZE - TILE_OVERLAP);
        const y0 = Math.max(0, ty * TILE_SIZE - TILE_OVERLAP);
        const x1 = Math.min(width,  (tx + 1) * TILE_SIZE + TILE_OVERLAP);
        const y1 = Math.min(height, (ty + 1) * TILE_SIZE + TILE_OVERLAP);
        let tileW = x1 - x0;
        let tileH = y1 - y0;

        let tileData = extractTile(imageData, width, x0, y0, tileW, tileH);

        // Track original tile size before any padding
        const origTileW = tileW;
        const origTileH = tileH;

        // For fixed-input models: pad tile to exactly the required size
        if (FIXED_INPUT !== null && (tileW !== FIXED_INPUT || tileH !== FIXED_INPUT)) {
          tileData = padTileToFixedSize(tileData, tileW, tileH, FIXED_INPUT, FIXED_INPUT);
          tileW = FIXED_INPUT;
          tileH = FIXED_INPUT;
        }

        const tensor = preprocessImage(tileData, tileW, tileH, inputType);
        const inputName = session.inputNames[0];
        const results = await session.run({ [inputName]: tensor });
        const outputTensor = results[session.outputNames[0]];
        let tileResult = postprocessTensor(outputTensor, tileW * scale, tileH * scale);

        // If we padded, crop back to the real (unpadded) scaled area
        if (tileW !== origTileW || tileH !== origTileH) {
          tileResult = cropTile(tileResult, tileW * scale, tileH * scale,
                                0, 0, origTileW * scale, origTileH * scale);
        }

        // Destination on the scaled canvas (trimming overlap padding)
        const destX = tx * TILE_SIZE * scale;
        const destY = ty * TILE_SIZE * scale;
        const cropLeft  = (x0 === 0     ? 0 : TILE_OVERLAP) * scale;
        const cropTop   = (y0 === 0     ? 0 : TILE_OVERLAP) * scale;
        const cropRight = (x1 === width  ? 0 : TILE_OVERLAP) * scale;
        const cropBot   = (y1 === height ? 0 : TILE_OVERLAP) * scale;

        const cropW = origTileW * scale - cropLeft - cropRight;
        const cropH = origTileH * scale - cropTop  - cropBot;
        const croppedData = cropImageData(tileResult, origTileW * scale, origTileH * scale,
                                          cropLeft, cropTop, cropW, cropH,
                                          imageData, width, height, scale, x0, y0);


        self.postMessage(
          { type: 'tile', buffer: croppedData.buffer, cropW, cropH, destX, destY },
          [croppedData.buffer]  // transfer ownership — zero copy
        );

        processedTiles++;
        // Map to 25–95 range
        self.postMessage({ type: 'progress', progress: 25 + Math.round((processedTiles / totalTiles) * 70) });
      }
    }

    self.postMessage({ type: 'success', width: outWidth, height: outHeight });

  } catch (error) {
    console.error(`[ONNX Worker] Inference failed: ${error.message}`);
    self.postMessage({ type: 'error', message: error.message });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTile(imageData, srcWidth, x0, y0, tileW, tileH) {
  const src = imageData.data;
  const tile = new ImageData(tileW, tileH);
  const dst = tile.data;
  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const si = ((y0 + y) * srcWidth + (x0 + x)) * 4;
      const di = (y * tileW + x) * 4;
      dst[di]     = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return tile;
}

function float32ToFloat16Buffer(f32arr) {
  const f16 = new Uint16Array(f32arr.length);
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  for (let i = 0; i < f32arr.length; i++) {
    f32[0] = f32arr[i];
    const x = u32[0];
    const sign = (x >>> 16) & 0x8000;
    const exp  = ((x >>> 23) & 0xff) - 127 + 15;
    const mant = x & 0x7fffff;
    if (exp <= 0) {
      f16[i] = sign;
    } else if (exp >= 31) {
      f16[i] = sign | 0x7c00;
    } else {
      f16[i] = sign | (exp << 10) | (mant >>> 13);
    }
  }
  return f16;
}

function preprocessImage(imageData, width, height, inputType) {
  const data = imageData.data;
  const float32Data = new Float32Array(3 * width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      float32Data[0 * width * height + y * width + x] = data[i]     / 255.0;
      float32Data[1 * width * height + y * width + x] = data[i + 1] / 255.0;
      float32Data[2 * width * height + y * width + x] = data[i + 2] / 255.0;
    }
  }
  if (inputType === 'float16') {
    return new ort.Tensor('float16', float32ToFloat16Buffer(float32Data), [1, 3, height, width]);
  }
  return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
}

function float16ToFloat32(h) {
  const sign = (h & 0x8000) ? -1 : 1;
  const exp  = (h >>> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0)  return sign * Math.pow(2, -14) * (mant / 1024);
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * Math.pow(2, exp - 15) * (1 + mant / 1024);
}

function postprocessTensor(tensor, width, height) {
  const raw = tensor.data;
  const imageData = new ImageData(width, height);
  const out = imageData.data;
  const isF16 = tensor.type === 'float16';
  const get = isF16 ? (i) => float16ToFloat32(raw[i]) : (i) => raw[i];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      out[i]     = Math.max(0, Math.min(255, Math.round(get(0 * width * height + y * width + x) * 255)));
      out[i + 1] = Math.max(0, Math.min(255, Math.round(get(1 * width * height + y * width + x) * 255)));
      out[i + 2] = Math.max(0, Math.min(255, Math.round(get(2 * width * height + y * width + x) * 255)));
      out[i + 3] = 255;
    }
  }
  return imageData;
}

/**
 * Pads a tile with edge-replication to dstW × dstH.
 * Ensures fixed-input models always receive the exact expected tensor shape.
 */
function padTileToFixedSize(tile, srcW, srcH, dstW, dstH) {
  const src = tile.data;
  const out = new ImageData(dstW, dstH);
  const dst = out.data;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      // Clamp coordinates to source bounds (edge-replication padding)
      const sx = Math.min(x, srcW - 1);
      const sy = Math.min(y, srcH - 1);
      const si = (sy * srcW + sx) * 4;
      const di = (y  * dstW + x)  * 4;
      dst[di]     = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return out;
}

/**
 * Crops a region from an ImageData.
 */
function cropTile(tile, srcW, _srcH, cropX, cropY, cropW, cropH) {
  const src = tile.data;
  const out = new ImageData(cropW, cropH);
  const dst = out.data;
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((cropY + y) * srcW + (cropX + x)) * 4;
      const di = (y * cropW + x) * 4;
      dst[di]     = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return out;
}

/**
 * Returns a Uint8ClampedArray for a cropped region of the tile,
 * with alpha channel restored from the original image.
 */
function cropImageData(tile, tileW, tileH, cropL, cropT, cropW, cropH,
                       origImageData, origW, origH, scale, origTileX, origTileY) {
  const src = tile.data;
  const out = new Uint8ClampedArray(cropW * cropH * 4);
  const orig = origImageData.data;

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = ((cropT + y) * tileW + (cropL + x)) * 4;
      const di = (y * cropW + x) * 4;
      out[di]     = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];

      // Restore nearest-neighbour alpha from original image
      const ox = Math.min(Math.floor((origTileX * scale + cropL + x) / scale), origW - 1);
      const oy = Math.min(Math.floor((origTileY * scale + cropT + y) / scale), origH - 1);
      out[di + 3] = orig[(oy * origW + ox) * 4 + 3];
    }
  }
  return out;
}
