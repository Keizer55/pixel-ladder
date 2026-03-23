import React, { useState, useRef } from 'react';
import { useUpscaleEngine } from '../lib/UpscaleEngine';
import { Upload, Download, Zap } from 'lucide-react';

export default function QuickScale() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelType, setModelType] = useState<'x2' | 'x4' | 'x4-anime' | 'pixel-art'>('x2');
  const [result, setResult] = useState<{ url: string; width: number; height: number; timeMs: number } | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upscaleImage, isProcessing, progress, error } = useUpscaleEngine();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
      setZoomPos({ x: 50, y: 50 });
      // Read original image dimensions
      const img = new window.Image();
      img.onload = () => setOriginalDims({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = url;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
      setZoomPos({ x: 50, y: 50 });
      // Read original image dimensions
      const img = new window.Image();
      img.onload = () => setOriginalDims({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = url;
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    try {
      const res = await upscaleImage(selectedFile, modelType);
      setResult({
        url: res.imageUrl,
        width: res.width,
        height: res.height,
        timeMs: res.timeMs,
      });
      setZoomPos({ x: 50, y: 50 });
    } catch (err) {
      console.error(err);
    }
  };

  const updateZoomPos = (clientX: number, clientY: number, currentTarget: EventTarget & HTMLDivElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateZoomPos(e.clientX, e.clientY, e.currentTarget);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    updateZoomPos(touch.clientX, touch.clientY, e.currentTarget);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Controls */}
        <div className="flex flex-col gap-6">
          <div 
            className="border-2 border-dashed border-muted/50 p-8 text-center cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />
            <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-xl uppercase">Click or Drag Image Here</p>
            {selectedFile && (
              <p className="mt-2 text-sm text-muted">Selected: {selectedFile.name}</p>
            )}
          </div>

          <div className="tech-panel-inner tech-panel-inner-corner p-4">
            <h3 className="text-sm mb-4 uppercase text-text tracking-wider">Select Model</h3>
            <div className="flex flex-wrap gap-2">
              {(['x2', 'x4', 'x4-anime', 'pixel-art'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModelType(m)}
                  className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm transition-all uppercase rounded-sm ${
                    modelType === m
                      ? 'tech-button-active'
                      : 'tech-button'
                  }`}
                >
                  {m === 'x4-anime' ? 'X4 ANIME' : m === 'pixel-art' ? 'PIXEL ART (CRISP X4)' : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={!selectedFile || isProcessing}
            className={`py-4 text-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm ${
              !selectedFile || isProcessing
                ? 'bg-muted/30 text-muted cursor-not-allowed border border-muted/30'
                : 'tech-button-active'
            }`}
          >
            <Zap className="w-6 h-6" />
            {isProcessing ? (
              <span className="flex items-center gap-3">
                {/* Spinning ring */}
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                <span>{progress}%</span>
                {/* Pulsing dot */}
                <span className="w-2 h-2 rounded-full bg-current animate-pulse inline-block" />
              </span>
            ) : 'Upscale Now'}
          </button>

          {error && <p className="text-red-500 text-lg uppercase">{error}</p>}
        </div>

        {/* Right Column: Preview */}
        <div className="tech-panel-inner tech-panel-inner-corner p-4 flex flex-col">
          <h3 className="text-sm mb-4 uppercase text-text tracking-wider flex justify-between items-center flex-wrap gap-2">
            <span>Preview</span>
            <span className="flex items-center gap-3">
              {/* Resolution badge */}
              {result ? (
                <span className="text-accent text-xs font-mono">
                  {originalDims?.width} × {originalDims?.height} → {result.width} × {result.height} px
                </span>
              ) : originalDims ? (
                <span className="text-muted text-xs font-mono">
                  {originalDims.width} × {originalDims.height} px
                </span>
              ) : null}
              {result && (
                <a
                  href={result.url}
                  download={`upscaled-${modelType}.png`}
                  className="flex items-center gap-2 tech-button-active px-4 py-2 uppercase rounded-sm text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
            </span>
          </h3>
          
          <div className="flex-1 bg-bg border border-muted/30 relative min-h-[300px] flex items-center justify-center overflow-hidden p-2">
            <div className="absolute inset-0 dot-grid pointer-events-none"></div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-bg/80 flex items-center justify-center z-10 flex-col gap-4">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl text-accent animate-pulse">Neural Net Active...</p>
              </div>
            )}
            
            {result ? (
              <div 
                className="relative cursor-crosshair flex items-center justify-center h-[360px] max-w-[90%] bg-white rounded-sm drop-shadow-xl z-10 p-2"
              >
                <img 
                  src={result.url} 
                  alt="Upscaled high-resolution result from Pixel Ladder AI" 
                  className="max-w-full max-h-full block relative z-10"
                  draggable={false}
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  onTouchMove={handleTouchMove}
                  onTouchStart={() => setIsHovering(true)}
                  onTouchEnd={() => setIsHovering(false)}
                />
                
                {/* Zoom Rectangle Overlay */}
                {isHovering && (
                  <div 
                    className="absolute border-2 border-accent bg-accent/20 pointer-events-none z-20"
                    style={{
                      left: `calc(${zoomPos.x}% - 10%)`,
                      top: `calc(${zoomPos.y}% - 10%)`,
                      width: '20%',
                      height: '20%',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)'
                    }}
                  />
                )}
              </div>
            ) : previewUrl ? (
              <div className="relative flex items-center justify-center h-[360px] max-w-[90%] bg-white rounded-sm drop-shadow-xl z-10 p-2">
                <img 
                  src={previewUrl} 
                  alt="Original image preview for AI upscaling" 
                  className="max-w-full max-h-full block"
                />
              </div>
            ) : (
              <p className="text-muted uppercase text-xl z-10">No Image Loaded</p>
            )}
          </div>

          {/* Zoom Comparison Section */}
          {result && (
            <div className="mt-4 flex flex-col gap-2">
              <h4 className="text-sm uppercase text-accent border-b border-accent/20 pb-1">Detail Comparison (8x Zoom)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase text-center">Original{originalDims ? ` (${originalDims.width}×${originalDims.height})` : ''}</span>
                  <div 
                    className="w-full aspect-square bg-white border border-muted/50 bg-no-repeat"
                    style={{
                      backgroundImage: `url(${previewUrl})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: '800%',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-accent uppercase text-center">Upscaled ({result.width}×{result.height})</span>
                  <div 
                    className="w-full aspect-square bg-white border border-accent bg-no-repeat"
                    style={{
                      backgroundImage: `url(${result.url})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: '800%',
                      imageRendering: modelType === 'pixel-art' ? 'pixelated' : 'auto'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-muted">Time: {result.timeMs}ms</p>
            </div>
          )}
        </div>
      </div>

      {/* Explanation Section */}
      <section className="mt-4 p-6 border border-muted/30 bg-panel text-center rounded-sm">
        <h3 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" /> How Pixel Ladder Works
        </h3>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          <strong>Pixel Ladder</strong> uses a state-of-the-art neural network (ONNX Runtime Web) to automatically upscale, crop, and enhance your digital images <strong>entirely inside your browser</strong>. 
          Because we use local AI image upscaling, no data or photos are ever sent to any external server, ensuring complete 100% privacy and security for your images. 
          <br/><br/>
          <span className="text-accent/80">
            ⚠️ Note: Since this free browser-based upscaler runs locally on your device, processing very high-resolution images or using complex print preparation pipelines may consume significant CPU/GPU resources and take a few moments to complete.
          </span>
        </p>
      </section>
    </div>
  );
}
