import { useState, useEffect, useCallback, useRef } from 'react';

export interface UpscaleResult {
  imageUrl: string;
  width: number;
  height: number;
  timeMs: number;
}

export function useUpscaleEngine() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker for ONNX inference
    workerRef.current = new Worker(new URL('./onnx-worker.js', import.meta.url), {
      type: 'module',
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const upscaleImage = useCallback(async (
    imageFile: File,
    modelType: 'x2' | 'x4' | 'x4-anime' | 'pixel-art'
  ): Promise<UpscaleResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const scale = modelType === 'x2' ? 2 : 4;

      const img = new Image();
      const objectUrl = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        // Create canvas to get image data
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Canvas Scaling function
        const runCanvasScaling = () => {
          console.log("Running fallback canvas scaling...");
          const interval = setInterval(() => {
            setProgress((p) => {
              if (p >= 90) {
                clearInterval(interval);
                return 90;
              }
              return p + 20;
            });
          }, 50);

          const targetWidth = img.width * scale;
          const targetHeight = img.height * scale;
          
          const outCanvas = document.createElement('canvas');
          outCanvas.width = targetWidth;
          outCanvas.height = targetHeight;
          const outCtx = outCanvas.getContext('2d');
          
          if (!outCtx) return;
          
          outCtx.imageSmoothingEnabled = false; // Nearest-neighbor for crisp pixels
          outCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

          setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
            const resultUrl = outCanvas.toDataURL('image/png');
            URL.revokeObjectURL(objectUrl);
            setIsProcessing(false);
            resolve({
              imageUrl: resultUrl,
              width: targetWidth,
              height: targetHeight,
              timeMs: Math.round(performance.now() - startTime),
            });
          }, modelType === 'pixel-art' ? 100 : 1500 + (scale * 500)); // Make pixel-art instant
        };

        // Bypass worker entirely if using pixel-art
        if (modelType === 'pixel-art') {
           runCanvasScaling();
           return;
        }

        if (workerRef.current) {
          // Output canvas is created lazily once we know final dimensions
          let outCanvas: HTMLCanvasElement | null = null;
          let outCtx: CanvasRenderingContext2D | null = null;

          workerRef.current.onmessage = (e) => {
            const data = e.data;

            if (data.type === 'progress') {
              setProgress(data.progress);

            } else if (data.type === 'tile') {
              // Lazily create the output canvas on first tile
              if (!outCanvas) {
                const outWidth  = img.width  * scale;
                const outHeight = img.height * scale;
                outCanvas = document.createElement('canvas');
                outCanvas.width  = outWidth;
                outCanvas.height = outHeight;
                outCtx = outCanvas.getContext('2d');
              }
              if (!outCtx) return;

              // Reconstruct ImageData from the transferred ArrayBuffer
              const pixels = new Uint8ClampedArray(data.buffer);
              const tileImageData = new ImageData(pixels, data.cropW, data.cropH);
              outCtx.putImageData(tileImageData, data.destX, data.destY);

            } else if (data.type === 'success') {
              setProgress(100);
              if (!outCanvas) return;
              const resultUrl = outCanvas.toDataURL('image/png');
              URL.revokeObjectURL(objectUrl);
              setIsProcessing(false);
              resolve({
                imageUrl: resultUrl,
                width: data.width,
                height: data.height,
                timeMs: Math.round(performance.now() - startTime),
              });

            } else if (data.type === 'error') {
              URL.revokeObjectURL(objectUrl);
              setIsProcessing(false);
              const msg = `Model inference failed: ${data.message}`;
              setError(msg);
              reject(new Error(msg));
            }
          };

          // Send image data to worker
          setProgress(5);
          workerRef.current.postMessage({
            imageData,
            width: img.width,
            height: img.height,
            modelType
          });
        } else {
          URL.revokeObjectURL(objectUrl);
          setIsProcessing(false);
          const msg = 'ONNX worker not available';
          setError(msg);
          reject(new Error(msg));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setIsProcessing(false);
        setError('Failed to load image');
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }, []);

  return {
    upscaleImage,
    isProcessing,
    progress,
    error,
  };
}
