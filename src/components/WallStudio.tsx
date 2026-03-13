import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { getPrintDimensions } from '../lib/PrintCalculator';
import { LayoutDashboard, Plus, Trash2, Upload, Image as ImageIcon, Ruler, X, Download, Save, UploadCloud, Zap, AlertTriangle } from 'lucide-react';

interface FrameData {
  id: string;
  width: number;
  height: number;
  image: string | null;
  x?: number;
  y?: number;
  imageWidth?: number;
  imageHeight?: number;
}

export default function WallStudio() {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [wallWidth, setWallWidth] = useState<number>(300);
  const [wallHeight, setWallHeight] = useState<number>(200);
  
  const [newFrameWidth, setNewFrameWidth] = useState<number>(30);
  const [newFrameHeight, setNewFrameHeight] = useState<number>(40);
  
  const [frames, setFrames] = useState<FrameData[]>([]);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);

  // Background & Calibration State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgSize, setBgSize] = useState<{w: number, h: number} | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibStep, setCalibStep] = useState<0 | 1 | 2>(0); // 0: off, 1: wait click 1, 2: wait click 2
  const [calibStart, setCalibStart] = useState<{x: number, y: number} | null>(null);
  const [calibEnd, setCalibEnd] = useState<{x: number, y: number} | null>(null);
  const [calibLength, setCalibLength] = useState<number>(100);

  // If we have a background image, the virtual wall takes its intrinsic aspect ratio
  const virtualWallWidth = bgSize ? bgSize.w : wallWidth;
  const virtualWallHeight = bgSize ? bgSize.h : wallHeight;

  // Calculate scale to fit wall in wrapper
  useEffect(() => {
    if (!wrapperRef.current) return;
    
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      const availableWidth = width - 40;
      const availableHeight = height - 40;
      
      const scaleX = availableWidth / virtualWallWidth;
      const scaleY = availableHeight / virtualWallHeight;
      setScale(Math.min(scaleX, scaleY));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapperRef.current);
    updateScale();
    
    return () => observer.disconnect();
  }, [virtualWallWidth, virtualWallHeight]);

  // Calculate the scale for frames (pixels per unit)
  let frameScale = scale;
  if (bgImage && calibStart && calibEnd && calibLength > 0) {
    const renderedW = virtualWallWidth * scale;
    const renderedH = virtualWallHeight * scale;
    const dx = (calibEnd.x - calibStart.x) * renderedW;
    const dy = (calibEnd.y - calibStart.y) * renderedH;
    const linePx = Math.sqrt(dx*dx + dy*dy);
    frameScale = linePx / calibLength;
  } else if (bgImage) {
    // Fallback if not calibrated: assume the image width is the wallWidth
    frameScale = (virtualWallWidth * scale) / wallWidth;
  }

  const handleAddFrame = () => {
    if (newFrameWidth > 0 && newFrameHeight > 0) {
      setFrames([
        ...frames,
        { id: Math.random().toString(36).substring(7), width: newFrameWidth, height: newFrameHeight, image: null, x: undefined, y: undefined, imageWidth: undefined, imageHeight: undefined }
      ]);
    }
  };

  const handleRemoveFrame = (id: string) => setFrames(frames.filter(f => f.id !== id));

  const handleUploadClick = (id: string) => {
    setActiveFrameId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeFrameId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Read image dimensions
        const img = new window.Image();
        img.onload = () => {
          setFrames(prev => prev.map(f => f.id === activeFrameId ? { ...f, image: base64, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight } : f));
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveFrameId(null);
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibStep(1);
    setCalibStart(null);
    setCalibEnd(null);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setBgImage(base64);
        setCalibStart(null);
        setCalibEnd(null);
        startCalibration();
      };
      reader.readAsDataURL(file);
    }
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const removeBg = () => {
    setBgImage(null);
    setBgSize(null);
    setCalibStart(null);
    setCalibEnd(null);
    setIsCalibrating(false);
  };

  const handleWallClick = (e: React.MouseEvent) => {
    if (!isCalibrating || !wallRef.current) return;
    const rect = wallRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (calibStep === 1) {
      setCalibStart({x, y});
      setCalibEnd({x, y});
      setCalibStep(2);
    } else if (calibStep === 2) {
      setCalibEnd({x, y});
      setCalibStep(0);
      setIsCalibrating(false);
    }
  };

  const handleWallMouseMove = (e: React.MouseEvent) => {
    if (calibStep !== 2 || !wallRef.current) return;
    const rect = wallRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCalibEnd({x, y});
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setBgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const handleDownloadPreview = async () => {
    if (!wallRef.current) return;
    try {
      // Read current theme colors from CSS custom properties
      const rootStyles = getComputedStyle(document.documentElement);
      const colorBg = rootStyles.getPropertyValue('--color-bg').trim();
      const colorPanel = rootStyles.getPropertyValue('--color-panel').trim();
      const colorMuted = rootStyles.getPropertyValue('--color-muted').trim();
      const colorAccent = rootStyles.getPropertyValue('--color-accent').trim();

      const wallRect = wallRef.current.getBoundingClientRect();
      const pixelRatio = 2;
      const canvasW = wallRect.width * pixelRatio;
      const canvasH = wallRect.height * pixelRatio;
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(pixelRatio, pixelRatio);

      // Helper: draw dot-grid pattern on a region (matching CSS .dot-grid)
      const drawDotGrid = (rx: number, ry: number, rw: number, rh: number, bgColor: string) => {
        ctx.fillStyle = bgColor;
        ctx.fillRect(rx, ry, rw, rh);
        // Parse muted color to create a 40% opacity version
        ctx.fillStyle = colorMuted;
        ctx.globalAlpha = 0.4;
        const dotSpacing = 20;
        for (let dotX = rx + dotSpacing / 2; dotX < rx + rw; dotX += dotSpacing) {
          for (let dotY = ry + dotSpacing / 2; dotY < ry + rh; dotY += dotSpacing) {
            ctx.beginPath();
            ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      };

      // Draw background
      if (bgImage) {
        const bgImg = new window.Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, wallRect.width, wallRect.height);
            resolve();
          };
          bgImg.onerror = () => resolve();
          bgImg.src = bgImage;
        });
      } else {
        // Draw the wall with dot-grid pattern matching the website
        drawDotGrid(0, 0, wallRect.width, wallRect.height, colorPanel);
        // Draw border
        ctx.strokeStyle = colorMuted;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, wallRect.width, wallRect.height);
        ctx.globalAlpha = 1;
      }

      // Draw each frame at its current position
      const frameElements = wallRef.current.querySelectorAll('[data-frame-id]') as NodeListOf<HTMLElement>;
      for (const el of frameElements) {
        const frameId = el.getAttribute('data-frame-id');
        const frame = frames.find(f => f.id === frameId);
        if (!frame) continue;

        const elRect = el.getBoundingClientRect();
        const x = elRect.left - wallRect.left;
        const y = elRect.top - wallRect.top;
        const w = elRect.width;
        const h = elRect.height;

        if (frame.image) {
          // Draw frame background
          ctx.fillStyle = colorBg;
          ctx.fillRect(x, y, w, h);

          const frameImg = new window.Image();
          frameImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            frameImg.onload = () => {
              // object-cover logic
              const imgAspect = frameImg.naturalWidth / frameImg.naturalHeight;
              const frameAspect = w / h;
              let sx = 0, sy = 0, sw = frameImg.naturalWidth, sh = frameImg.naturalHeight;
              if (imgAspect > frameAspect) {
                sw = frameImg.naturalHeight * frameAspect;
                sx = (frameImg.naturalWidth - sw) / 2;
              } else {
                sh = frameImg.naturalWidth / frameAspect;
                sy = (frameImg.naturalHeight - sh) / 2;
              }
              ctx.drawImage(frameImg, sx, sy, sw, sh, x, y, w, h);
              resolve();
            };
            frameImg.onerror = () => resolve();
            frameImg.src = frame.image!;
          });
        } else {
          // Empty frame: draw with dot-grid pattern matching the wall style
          drawDotGrid(x, y, w, h, colorBg);
          // Frame label in accent color
          ctx.fillStyle = colorAccent;
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${frame.width}x${frame.height}`, x + w / 2, y + h / 2);
        }

        // Frame border matching theme
        ctx.strokeStyle = colorMuted;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const link = document.createElement('a');
      link.download = `pixel-ladder-preview-${yyyy}_${mm}_${dd}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download preview', err);
    }
  };

  // Collect current frame positions from the DOM
  const getFramePositions = (): FrameData[] => {
    return frames.map(frame => {
      const el = document.querySelector(`[data-frame-id="${frame.id}"]`) as HTMLElement | null;
      if (el) {
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        let tx = 0, ty = 0;
        if (transform && transform !== 'none') {
          const match = transform.match(/matrix\(([^)]+)\)/);
          if (match) {
            const values = match[1].split(',').map(v => parseFloat(v.trim()));
            tx = values[4] || 0;
            ty = values[5] || 0;
          }
        }
        return { ...frame, x: tx, y: ty };
      }
      return frame;
    });
  };

  const handleSaveConfig = () => {
    const framesWithPositions = getFramePositions();
    const config = { unit, wallWidth, wallHeight, frames: framesWithPositions, bgImage, bgSize, calibStart, calibEnd, calibLength };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
    const link = document.createElement('a');
    link.download = "wall-config.json";
    link.href = dataStr;
    link.click();
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.unit) setUnit(config.unit);
        if (config.wallWidth) setWallWidth(config.wallWidth);
        if (config.wallHeight) setWallHeight(config.wallHeight);
        if (config.frames) setFrames(config.frames);
        if (config.bgImage !== undefined) setBgImage(config.bgImage);
        if (config.bgSize !== undefined) setBgSize(config.bgSize);
        if (config.calibStart !== undefined) setCalibStart(config.calibStart);
        if (config.calibEnd !== undefined) setCalibEnd(config.calibEnd);
        if (config.calibLength !== undefined) setCalibLength(config.calibLength);
      } catch (err) {
        console.error("Failed to parse config", err);
      }
    };
    reader.readAsText(file);
    if (configInputRef.current) configInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="tech-panel-inner tech-panel-inner-corner p-4 md:p-6">
        <h2 className="text-xl md:text-2xl mb-6 uppercase flex items-center gap-3 text-text font-light tracking-wider">
          <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          Wall Setup Studio
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Controls */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            
            {/* Global Actions */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <h3 className="text-sm uppercase text-text mb-3 tracking-wider">Config</h3>
              <div className="flex gap-2">
                <button onClick={handleSaveConfig} className="flex-1 tech-button py-1.5 text-xs uppercase flex items-center justify-center gap-1 rounded-sm">
                  <Save className="w-3 h-3" /> Save
                </button>
                <button onClick={() => configInputRef.current?.click()} className="flex-1 tech-button py-1.5 text-xs uppercase flex items-center justify-center gap-1 rounded-sm">
                  <UploadCloud className="w-3 h-3" /> Load
                </button>
                <input type="file" accept=".json" ref={configInputRef} onChange={handleLoadConfig} className="hidden" />
              </div>
            </div>

            {/* Wall Settings & Background */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">Wall Setup</h3>
                <div className="flex gap-1">
                  <button onClick={() => setUnit('cm')} className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'cm' ? 'tech-button-active' : 'tech-button'}`}>CM</button>
                  <button onClick={() => setUnit('in')} className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'in' ? 'tech-button-active' : 'tech-button'}`}>IN</button>
                </div>
              </div>
              
              {!bgImage ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-muted uppercase text-[10px] mb-1">W: [{wallWidth}]</label>
                      <input type="number" value={wallWidth} onChange={(e) => setWallWidth(Number(e.target.value))} className="w-full bg-bg border border-muted/50 text-text p-1.5 text-xs font-mono rounded-sm focus:border-muted outline-none" />
                    </div>
                    <div>
                      <label className="block text-muted uppercase text-[10px] mb-1">H: [{wallHeight}]</label>
                      <input type="number" value={wallHeight} onChange={(e) => setWallHeight(Number(e.target.value))} className="w-full bg-bg border border-muted/50 text-text p-1.5 text-xs font-mono rounded-sm focus:border-muted outline-none" />
                    </div>
                  </div>
                  <button onClick={() => bgInputRef.current?.click()} className="w-full tech-button py-1.5 text-xs uppercase flex items-center justify-center gap-2 rounded-sm">
                    <Plus className="w-3 h-3" /> Add Wall Photo
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={startCalibration} className={`flex-1 py-1.5 text-xs uppercase rounded-sm flex items-center justify-center gap-1 ${isCalibrating ? 'tech-button-active' : 'tech-button'}`}>
                      <Ruler className="w-3 h-3" /> {isCalibrating ? 'Click 2 Points...' : 'Calibrate'}
                    </button>
                    <button onClick={removeBg} className="px-2 py-1.5 text-xs uppercase border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-bg flex items-center justify-center rounded-sm transition-colors" title="Remove Photo">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {calibStart && calibEnd && !isCalibrating && (
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-[10px] uppercase text-muted whitespace-nowrap">Line Length:</label>
                      <input type="number" value={calibLength} onChange={(e) => setCalibLength(Number(e.target.value))} className="w-full bg-bg border border-muted/50 text-text p-1 text-xs font-mono rounded-sm focus:border-muted outline-none" />
                      <span className="text-[10px] text-muted uppercase">{unit}</span>
                    </div>
                  )}
                </div>
              )}
              <input type="file" accept="image/*" ref={bgInputRef} onChange={handleBgUpload} className="hidden" />
            </div>

            {/* Add Frame */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">Add Frame</h3>
                <div className="flex gap-1">
                  <span className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'cm' ? 'tech-button-active' : 'tech-button'}`}>CM</span>
                  <span className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'in' ? 'tech-button-active' : 'tech-button'}`}>IN</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={newFrameWidth} onChange={(e) => setNewFrameWidth(Number(e.target.value))} className="w-full bg-bg border border-muted/50 text-text p-1.5 text-xs font-mono rounded-sm focus:border-muted outline-none" placeholder="W" />
                <span className="text-muted text-xs">x</span>
                <input type="number" value={newFrameHeight} onChange={(e) => setNewFrameHeight(Number(e.target.value))} className="w-full bg-bg border border-muted/50 text-text p-1.5 text-xs font-mono rounded-sm focus:border-muted outline-none" placeholder="H" />
                <button onClick={handleAddFrame} className="tech-button-active px-3 py-1.5 uppercase rounded-sm flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Frame List */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3 flex-1 flex flex-col min-h-[200px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">Frames</h3>
                <LayoutDashboard className="w-4 h-4 text-muted" />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {frames.length === 0 ? (
                  <p className="text-muted text-xs uppercase">No frames added.</p>
                ) : (
                  frames.map((frame, index) => {
                    const dims = getPrintDimensions(frame.width, frame.height, unit, 300);
                    // Check image quality warnings
                    const warnings: string[] = [];
                    if (frame.image && frame.imageWidth && frame.imageHeight) {
                      const imgAspect = frame.imageWidth / frame.imageHeight;
                      const frameAspect = frame.width / frame.height;
                      const aspectDiff = Math.abs(imgAspect - frameAspect) / frameAspect;
                      if (aspectDiff > 0.15) {
                        warnings.push(`Aspect ratio mismatch — image will be cropped (image: ${frame.imageWidth}×${frame.imageHeight})`);
                      }
                      if (frame.imageWidth < dims.widthPx || frame.imageHeight < dims.heightPx) {
                        warnings.push(`Low resolution — image is ${frame.imageWidth}×${frame.imageHeight}px, needs ${dims.widthPx}×${dims.heightPx}px @300DPI`);
                      }
                    }
                    return (
                      <div key={frame.id} className="bg-bg border border-muted/50 p-2 relative group flex flex-col gap-1.5 rounded-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-text uppercase text-xs">
                            Frame {index + 1} <span className="text-muted">({frame.width}x{frame.height}{unit})</span>
                          </span>
                          <button onClick={() => handleRemoveFrame(frame.id)} className="text-muted hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> {dims.widthPx}x{dims.heightPx}px @300DPI
                          </span>
                        </div>
                        {warnings.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {warnings.map((warn, wi) => (
                              <div key={wi} className="flex items-start gap-1 text-[10px] text-red-500">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span>{warn}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => handleUploadClick(frame.id)} className="w-full tech-button py-1 text-[10px] uppercase flex items-center justify-center gap-1 rounded-sm mt-1">
                          <Upload className="w-3 h-3" /> {frame.image ? 'Change Image' : 'Load Image'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>

          {/* Right Column: Wall Preview */}
          <div className="lg:col-span-3 tech-panel-inner tech-panel-inner-corner min-h-[500px] relative flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-3">
              <h3 className="text-sm uppercase text-text tracking-wider">Wall Preview</h3>
              <button 
                onClick={handleDownloadPreview}
                className="tech-button py-1 px-3 text-[10px] uppercase flex items-center gap-1 rounded-sm"
              >
                <Download className="w-3 h-3" /> Download Preview
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-4" ref={wrapperRef}>
              {isCalibrating && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-accent text-xs uppercase animate-pulse z-10 bg-bg/80 px-2 py-1 border border-accent/50 rounded-sm">Click two points to calibrate scale</div>}

              <div 
                ref={wallRef}
                onClick={handleWallClick}
                onMouseMove={handleWallMouseMove}
                className={`relative shadow-2xl overflow-hidden ${isCalibrating ? 'cursor-crosshair' : ''} ${!bgImage ? 'bg-panel border border-muted/50 dot-grid' : ''}`}
                style={{
                  width: virtualWallWidth * scale,
                  height: virtualWallHeight * scale,
                }}
              >
                {bgImage && (
                  <img src={bgImage} alt="Wall" onLoad={handleImageLoad} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
                )}

                {/* Calibration Line Overlay */}
                {bgImage && calibStart && calibEnd && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                    <line 
                      x1={`${calibStart.x * 100}%`} 
                      y1={`${calibStart.y * 100}%`} 
                      x2={`${calibEnd.x * 100}%`} 
                      y2={`${calibEnd.y * 100}%`} 
                      stroke="var(--color-accent)" 
                      strokeWidth="1" 
                      strokeDasharray="4"
                    />
                    <circle cx={`${calibStart.x * 100}%`} cy={`${calibStart.y * 100}%`} r="3" fill="var(--color-accent)" />
                    <circle cx={`${calibEnd.x * 100}%`} cy={`${calibEnd.y * 100}%`} r="3" fill="var(--color-accent)" />
                  </svg>
                )}

                {frames.map((frame, index) => {
                  // Default center position with offset per index
                  const defaultTop = (virtualWallHeight * scale) / 2 - (frame.height * frameScale) / 2 + (index * 10);
                  const defaultLeft = (virtualWallWidth * scale) / 2 - (frame.width * frameScale) / 2 + (index * 10);
                  return (
                    <motion.div
                      key={frame.id}
                      data-frame-id={frame.id}
                      drag={!isCalibrating}
                      dragMomentum={false}
                      dragConstraints={wallRef}
                      initial={frame.x !== undefined && frame.y !== undefined ? { x: frame.x, y: frame.y } : undefined}
                      className={`absolute bg-bg border border-muted shadow-lg flex items-center justify-center overflow-hidden ${!isCalibrating ? 'cursor-move' : ''} group`}
                      style={{
                        width: frame.width * frameScale,
                        height: frame.height * frameScale,
                        top: defaultTop,
                        left: defaultLeft,
                      }}
                      whileHover={!isCalibrating ? { scale: 1.02, zIndex: 50 } : {}}
                      whileDrag={!isCalibrating ? { scale: 1.05, zIndex: 50, boxShadow: "0px 10px 20px rgba(0,0,0,0.3)" } : {}}
                    >
                      {frame.image ? (
                        <img src={frame.image} alt={`Frame ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <div className="text-center p-1 pointer-events-none">
                          <p className="text-accent text-[10px] md:text-xs">{frame.width}x{frame.height}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Section */}
      <div className="mt-4 p-6 border border-muted/30 bg-panel text-center rounded-sm">
        <h4 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" /> How It Works
        </h4>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          Set your wall dimensions or upload a photo of your wall to use as a background. Add frames with custom sizes and drag them around the preview to plan your layout.
          <br/><br/>
          <span className="text-accent/80">
            📐 Tip: When using a wall photo, calibrate the scale by clicking two points on the wall and entering the real-world distance between them. This ensures frames are rendered at their true proportional size.
          </span>
        </p>
      </div>
    </div>
  );
}
