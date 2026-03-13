import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime Web to use WebAssembly
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

self.onmessage = async (e) => {
  const { imageData, width, height, modelType } = e.data;
  
  try {
    // Determine model path based on selection
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

    // 1. Initialize ONNX Runtime session
    // This will throw an error if the model file is not found in the public folder
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'] // Fallback to wasm if webgl/webgpu fails
    });

    self.postMessage({ type: 'progress', progress: 40, message: 'Preprocessing image...' });

    // 2. Pre-process image data to Tensor
    const tensor = preprocessImage(imageData, width, height);

    self.postMessage({ type: 'progress', progress: 60, message: 'Running inference...' });

    // 3. Run Inference
    // Note: The input name ('input') depends on the specific ONNX model architecture.
    // This is a generic assumption for standard SR models.
    const feeds = { input: tensor };
    const results = await session.run(feeds);
    
    // Assuming the output tensor is the first one
    const outputName = session.outputNames[0];
    const outputTensor = results[outputName];

    self.postMessage({ type: 'progress', progress: 90, message: 'Postprocessing result...' });

    // 4. Post-process Tensor back to Image Data (preserving alpha)
    const outImageData = postprocessTensor(outputTensor, width * scale, height * scale, width, height, imageData);

    // 5. Send result back to main thread
    self.postMessage({ 
      type: 'success', 
      imageData: outImageData,
      width: width * scale,
      height: height * scale
    });

  } catch (error) {
    console.warn(`[Worker] ONNX inference failed or model not found. Falling back to mock. Error: ${error.message}`);
    // Fallback if model is missing or inference fails
    self.postMessage({ type: 'fallback', error: error.message });
  }
};

// Helper functions for standard NCHW Float32 models (e.g., Real-ESRGAN)
function preprocessImage(imageData, width, height) {
  const data = imageData.data;
  const float32Data = new Float32Array(3 * width * height);
  
  // Convert RGBA to RGB, normalize to [0, 1], and reshape to [1, 3, height, width] (NCHW)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;
      
      float32Data[0 * width * height + y * width + x] = r;
      float32Data[1 * width * height + y * width + x] = g;
      float32Data[2 * width * height + y * width + x] = b;
    }
  }
  
  return new ort.Tensor('float32', float32Data, [1, 3, height, width]);
}

function postprocessTensor(tensor, width, height, origWidth, origHeight, origImageData) {
  const data = tensor.data;
  const imageData = new ImageData(width, height);
  const outData = imageData.data;
  
  // Convert [1, 3, height, width] back to RGBA, preserving nearest-neighbor alpha from original
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = data[0 * width * height + y * width + x];
      const g = data[1 * width * height + y * width + x];
      const b = data[2 * width * height + y * width + x];
      
      const i = (y * width + x) * 4;
      outData[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      outData[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      outData[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
      
      // Preserve alpha channel
      const origX = Math.floor(x * (origWidth / width));
      const origY = Math.floor(y * (origHeight / height));
      const origAlpha = origImageData.data[(origY * origWidth + origX) * 4 + 3];
      outData[i + 3] = origAlpha;
    }
  }
  
  return imageData;
}
