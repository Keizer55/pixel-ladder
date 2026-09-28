import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { getPrintDimensions } from '../lib/PrintCalculator';
import { LayoutDashboard, Plus, Trash2, Upload, Image as ImageIcon, Ruler, X, Download, Save, UploadCloud, Zap, AlertTriangle, Pencil, Check, ImagePlus } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { useWorkspace, dataUrlToBlob, blobToDataUrl } from '../lib/Workspace';
import Button from './ui/Button';
import ChoiceGroup from './ui/ChoiceGroup';
import ResolutionAlert, { formatScale } from './ui/ResolutionAlert';

interface FrameData {
  id: string;
  width: number;
  height: number;
  image: string | null;
  // Position of the frame's top-left corner, in wall units (cm/in) from the
  // wall's top-left corner. Scale-independent so it survives resize + reload.
  unitX?: number;
  unitY?: number;
  imageWidth?: number;
  imageHeight?: number;
}

const CONFIG_VERSION = 2;

let frameCounter = 0;
const createFrameId = () => `frame-${Date.now().toString(36)}-${(frameCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface WallFrameProps {
  // The project has no @types/react installed, so JSX does not contribute the
  // usual `key` attribute to component props — declare it explicitly.
  key?: string;
  frame: FrameData;
  index: number;
  unitX: number;
  unitY: number;
  frameScale: number;
  isCalibrating: boolean;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onDragEnd: (id: string) => void;
}

// A draggable frame. Its translate is driven by motion values so that a change
// in scale (window resize, wall resize) or a freshly loaded config repositions
// it, while dragging still writes to the very same values.
function WallFrame({ frame, index, unitX, unitY, frameScale, isCalibrating, constraintsRef, onDragEnd }: WallFrameProps) {
  const { t } = useI18n();
  const x = useMotionValue(unitX * frameScale);
  const y = useMotionValue(unitY * frameScale);

  useLayoutEffect(() => {
    x.set(unitX * frameScale);
    y.set(unitY * frameScale);
  }, [unitX, unitY, frameScale, x, y]);

  return (
    <motion.div
      data-frame-id={frame.id}
      drag={!isCalibrating}
      dragMomentum={false}
      dragConstraints={constraintsRef}
      onDragEnd={() => onDragEnd(frame.id)}
      className={`absolute bg-bg border border-muted shadow-lg flex items-center justify-center overflow-hidden ${!isCalibrating ? 'cursor-move' : ''} group`}
      style={{
        x,
        y,
        top: 0,
        left: 0,
        width: frame.width * frameScale,
        height: frame.height * frameScale,
      }}
      whileHover={!isCalibrating ? { scale: 1.02, zIndex: 50 } : {}}
      whileDrag={!isCalibrating ? { scale: 1.05, zIndex: 50, boxShadow: "0px 10px 20px rgba(0,0,0,0.3)" } : {}}
    >
      {frame.image ? (
        <img src={frame.image} alt={t.wall.altFrame(index + 1)} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="text-center p-1 pointer-events-none">
          <p className="text-accent text-xs">{frame.width}x{frame.height}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function WallStudio() {
  const { t } = useI18n();
  const { image: sharedImage, requestUpscale, frameDelivery, clearFrameDelivery } = useWorkspace();
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

  // Inline frame size editing
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [editWidth, setEditWidth] = useState<number>(0);
  const [editHeight, setEditHeight] = useState<number>(0);

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
      if (width <= 0 || height <= 0) return;
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

  // Size of the wall expressed in real-world units, used to place frames
  const wallUnitsWidth = frameScale > 0 ? (virtualWallWidth * scale) / frameScale : 0;
  const wallUnitsHeight = frameScale > 0 ? (virtualWallHeight * scale) / frameScale : 0;

  // Fallback placement for frames that have no stored position yet
  const defaultUnitPos = (frame: FrameData, index: number) => ({
    x: Math.max(0, wallUnitsWidth / 2 - frame.width / 2 + index * 5),
    y: Math.max(0, wallUnitsHeight / 2 - frame.height / 2 + index * 5),
  });

  const handleAddFrame = () => {
    if (newFrameWidth > 0 && newFrameHeight > 0) {
      const frame: FrameData = { id: createFrameId(), width: newFrameWidth, height: newFrameHeight, image: null, imageWidth: undefined, imageHeight: undefined };
      const pos = defaultUnitPos(frame, frames.length);
      setFrames([...frames, { ...frame, unitX: pos.x, unitY: pos.y }]);
    }
  };

  const handleRemoveFrame = (id: string) => {
    setFrames(frames.filter(f => f.id !== id));
    if (editingFrameId === id) setEditingFrameId(null);
  };

  const startEditFrame = (frame: FrameData) => {
    setEditingFrameId(frame.id);
    setEditWidth(frame.width);
    setEditHeight(frame.height);
  };

  const commitEditFrame = () => {
    if (!editingFrameId) return;
    if (editWidth > 0 && editHeight > 0) {
      setFrames(prev => prev.map(f => f.id === editingFrameId ? { ...f, width: editWidth, height: editHeight } : f));
    }
    setEditingFrameId(null);
  };

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

  const setFrameImage = (id: string, dataUrl: string, imageWidth: number, imageHeight: number) => {
    setFrames(prev => prev.map(f => f.id === id ? { ...f, image: dataUrl, imageWidth, imageHeight } : f));
  };

  // An upscaled image coming back from Quick Scale replaces the frame's image.
  useEffect(() => {
    if (!frameDelivery) return;
    setFrameImage(frameDelivery.frameId, frameDelivery.dataUrl, frameDelivery.width, frameDelivery.height);
    clearFrameDelivery();
  }, [frameDelivery]);

  const handleUseSharedImage = async (id: string) => {
    if (!sharedImage) return;
    const dataUrl = await blobToDataUrl(sharedImage.blob);
    setFrameImage(id, dataUrl, sharedImage.width, sharedImage.height);
  };

  const handleUpscaleFrame = (frame: FrameData, frameNumber: number, minScale: number) => {
    if (!frame.image) return;
    requestUpscale({
      minScale,
      source: { blob: dataUrlToBlob(frame.image), name: `frame-${frameNumber}.png`, origin: 'wall' },
      returnTo: { frameId: frame.id, frameNumber },
    });
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

  const handleBgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isCalibrating) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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

  // Read a frame's live translate from the DOM and convert it to wall units.
  // The frames are laid out at left/top 0, so the translate *is* the position.
  // Reading the matrix (rather than the bounding rect) keeps this immune to the
  // hover/drag scale effects.
  const readFrameUnitPos = (id: string): { unitX: number; unitY: number } | null => {
    if (frameScale <= 0) return null;
    const el = wallRef.current?.querySelector(`[data-frame-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const transform = window.getComputedStyle(el).transform;
    let tx = 0, ty = 0;
    if (transform && transform !== 'none') {
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        tx = values[4] || 0;
        ty = values[5] || 0;
      }
    }
    return { unitX: tx / frameScale, unitY: ty / frameScale };
  };

  // Persist the position back into state once a drag settles, so it survives
  // resizes, re-scaling and saving.
  const commitFramePosition = (id: string) => {
    const pos = readFrameUnitPos(id);
    if (!pos) return;
    setFrames(prev => prev.map(f => f.id === id ? { ...f, ...pos } : f));
  };

  const handleSaveConfig = () => {
    const framesWithPositions = frames.map((frame, index) => {
      const pos = readFrameUnitPos(frame.id);
      if (pos) return { ...frame, ...pos };
      if (frame.unitX !== undefined && frame.unitY !== undefined) return frame;
      const fallback = defaultUnitPos(frame, index);
      return { ...frame, unitX: fallback.x, unitY: fallback.y };
    });
    const config = { version: CONFIG_VERSION, unit, wallWidth, wallHeight, frames: framesWithPositions, bgImage, bgSize, calibStart, calibEnd, calibLength };
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

        // Any work in progress is replaced by the loaded config, so drop the
        // transient UI state first — otherwise calibration mode (which blocks
        // dragging) or a pending image upload would leak into the new layout.
        setIsCalibrating(false);
        setCalibStep(0);
        setActiveFrameId(null);
        setEditingFrameId(null);

        if (config.unit) setUnit(config.unit);
        if (config.wallWidth) setWallWidth(config.wallWidth);
        if (config.wallHeight) setWallHeight(config.wallHeight);

        if (Array.isArray(config.frames)) {
          // Positions are only meaningful from v2 onwards (older files stored
          // raw pixel offsets tied to the window size they were saved at).
          const positioned = config.version >= CONFIG_VERSION;
          // Always mint fresh ids: the loaded ones may collide with the frames
          // currently on the wall, which would make React reuse the existing
          // nodes and silently keep their old size and position.
          setFrames(config.frames.map((f: FrameData) => ({
            id: createFrameId(),
            width: Number(f.width) || 0,
            height: Number(f.height) || 0,
            image: f.image ?? null,
            imageWidth: f.imageWidth,
            imageHeight: f.imageHeight,
            unitX: positioned ? f.unitX : undefined,
            unitY: positioned ? f.unitY : undefined,
          })));
        }

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <h2 className="text-xl md:text-2xl uppercase flex items-center gap-3 text-text font-light tracking-wider">
              <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6 text-accent" aria-hidden="true" />
              {t.wall.title}
            </h2>

            {/* Global Actions */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <h3 className="text-sm uppercase text-text mb-3 tracking-wider">{t.wall.config}</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleSaveConfig} className="flex-1">
                  <Save className="w-3.5 h-3.5" aria-hidden="true" /> {t.wall.save}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => configInputRef.current?.click()} className="flex-1">
                  <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" /> {t.wall.load}
                </Button>
                <input type="file" accept=".json" ref={configInputRef} onChange={handleLoadConfig} className="hidden" />
              </div>
            </div>

            {/* Wall Settings & Background */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">{t.wall.wallSetup}</h3>
                <ChoiceGroup
                  label={t.wall.unitGroup}
                  value={unit}
                  onChange={setUnit}
                  options={[{ value: 'cm', label: 'CM' }, { value: 'in', label: 'IN' }]}
                  className="gap-1"
                  optionClassName="h-7 px-2 text-xs"
                />
              </div>

              {!bgImage ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label htmlFor="wall-width" className="block text-muted uppercase text-xs mb-1">{t.wall.w}: [{wallWidth}]</label>
                      <input id="wall-width" aria-label={t.wall.wallWidth} type="number" value={wallWidth} onChange={(e) => setWallWidth(Number(e.target.value))} className="w-full bg-bg border border-border text-text p-1.5 text-xs font-mono rounded-sm" />
                    </div>
                    <div>
                      <label htmlFor="wall-height" className="block text-muted uppercase text-xs mb-1">{t.wall.h}: [{wallHeight}]</label>
                      <input id="wall-height" aria-label={t.wall.wallHeight} type="number" value={wallHeight} onChange={(e) => setWallHeight(Number(e.target.value))} className="w-full bg-bg border border-border text-text p-1.5 text-xs font-mono rounded-sm" />
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => bgInputRef.current?.click()} className="w-full">
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" /> {t.wall.addWallPhoto}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant={isCalibrating ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={startCalibration}
                      aria-pressed={isCalibrating}
                      className="flex-1"
                    >
                      <Ruler className="w-3.5 h-3.5" aria-hidden="true" /> {isCalibrating ? t.wall.clickTwoPoints : t.wall.calibrate}
                    </Button>
                    <Button variant="danger" size="sm" iconOnly onClick={removeBg} aria-label={t.wall.removePhoto} title={t.wall.removePhoto}>
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {calibStart && calibEnd && !isCalibrating && (
                    <div className="flex items-center gap-2 mt-1">
                      <label htmlFor="calib-length" className="text-xs uppercase text-muted whitespace-nowrap">{t.wall.lineLength}</label>
                      <input id="calib-length" type="number" value={calibLength} onChange={(e) => setCalibLength(Number(e.target.value))} className="w-full bg-bg border border-border text-text p-1 text-xs font-mono rounded-sm" />
                      <span className="text-xs text-muted uppercase">{unit}</span>
                    </div>
                  )}
                </div>
              )}
              <input type="file" accept="image/*" ref={bgInputRef} onChange={handleBgUpload} className="hidden" />
            </div>

            {/* Add Frame */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">{t.wall.addFrame}</h3>
                <div className="flex gap-1" aria-hidden="true">
                  <span className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'cm' ? 'tech-button-active' : 'tech-button'}`}>CM</span>
                  <span className={`px-2 py-0.5 text-[10px] uppercase rounded-sm ${unit === 'in' ? 'tech-button-active' : 'tech-button'}`}>IN</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" aria-label={t.wall.newFrameWidth} value={newFrameWidth} onChange={(e) => setNewFrameWidth(Number(e.target.value))} className="w-full bg-bg border border-border text-text p-1.5 text-xs font-mono rounded-sm" placeholder="W" />
                <span className="text-muted text-xs" aria-hidden="true">x</span>
                <input type="number" aria-label={t.wall.newFrameHeight} value={newFrameHeight} onChange={(e) => setNewFrameHeight(Number(e.target.value))} className="w-full bg-bg border border-border text-text p-1.5 text-xs font-mono rounded-sm" placeholder="H" />
                <button type="button" onClick={handleAddFrame} aria-label={t.wall.addNewFrame} className="tech-button-active px-3 py-1.5 uppercase rounded-sm flex items-center justify-center">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Frame List */}
            <div className="tech-panel-inner tech-panel-inner-corner p-3 flex-1 flex flex-col min-h-[200px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm uppercase text-text tracking-wider">{t.wall.frames}</h3>
                <LayoutDashboard className="w-4 h-4 text-muted" aria-hidden="true" />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {frames.length === 0 ? (
                  <p className="text-muted text-xs uppercase">{t.wall.noFrames}</p>
                ) : (
                  frames.map((frame, index) => {
                    const frameNumber = index + 1;
                    const dims = getPrintDimensions(frame.width, frame.height, unit, 300);
                    // Check image quality warnings
                    let aspectMismatch = false;
                    let scaleNeeded = 1;
                    if (frame.image && frame.imageWidth && frame.imageHeight) {
                      const imgAspect = frame.imageWidth / frame.imageHeight;
                      const frameAspect = frame.width / frame.height;
                      aspectMismatch = Math.abs(imgAspect - frameAspect) / frameAspect > 0.15;
                      scaleNeeded = Math.max(dims.widthPx / frame.imageWidth, dims.heightPx / frame.imageHeight);
                    }
                    const isLowRes = scaleNeeded > 1;
                    return (
                      <div key={frame.id} className="bg-bg border border-border p-2.5 relative group flex flex-col gap-2 rounded-sm">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-text uppercase text-xs">
                            {t.wall.frame(frameNumber)} <span className="text-muted">({frame.width}x{frame.height}{unit})</span>
                          </span>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={() => editingFrameId === frame.id ? setEditingFrameId(null) : startEditFrame(frame)}
                              aria-label={t.wall.editSize(frameNumber)}
                              aria-expanded={editingFrameId === frame.id}
                              title={t.wall.editSize(frameNumber)}
                              className={editingFrameId === frame.id ? 'text-accent' : ''}
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={() => handleRemoveFrame(frame.id)}
                              aria-label={t.wall.removeFrame(frameNumber)}
                              title={t.wall.removeFrame(frameNumber)}
                              className="hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        {editingFrameId === frame.id && (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              value={editWidth}
                              autoFocus
                              onChange={(e) => setEditWidth(Number(e.target.value))}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEditFrame(); if (e.key === 'Escape') setEditingFrameId(null); }}
                              aria-label={t.wall.frameWidth}
                              className="w-full bg-bg border border-border text-text p-1 text-xs font-mono rounded-sm"
                            />
                            <span className="text-muted text-xs" aria-hidden="true">x</span>
                            <input
                              type="number"
                              value={editHeight}
                              onChange={(e) => setEditHeight(Number(e.target.value))}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEditFrame(); if (e.key === 'Escape') setEditingFrameId(null); }}
                              aria-label={t.wall.frameHeight}
                              className="w-full bg-bg border border-border text-text p-1 text-xs font-mono rounded-sm"
                            />
                            <Button variant="primary" size="sm" iconOnly onClick={commitEditFrame} aria-label={t.wall.saveSize} title={t.wall.saveSize}>
                              <Check className="w-4 h-4" aria-hidden="true" />
                            </Button>
                            <Button variant="secondary" size="sm" iconOnly onClick={() => setEditingFrameId(null)} aria-label={t.wall.cancelEdit} title={t.wall.cancelEdit}>
                              <X className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                        <span className="text-muted flex items-center gap-1 text-xs">
                          <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> {dims.widthPx} × {dims.heightPx} px @300DPI
                        </span>
                        {aspectMismatch && frame.imageWidth && frame.imageHeight && (
                          <p className="flex items-start gap-1.5 text-xs text-danger">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                            <span>{t.wall.aspectMismatch(frame.imageWidth, frame.imageHeight)}</span>
                          </p>
                        )}
                        {isLowRes && frame.imageWidth && frame.imageHeight && (
                          <ResolutionAlert
                            lead={t.common.lowResolution}
                            detail={t.wall.lowResDetail(frame.imageWidth, frame.imageHeight, dims.widthPx, dims.heightPx, formatScale(scaleNeeded))}
                            actionLabel={t.common.upscaleInQuickScale}
                            onAction={() => handleUpscaleFrame(frame, frameNumber, scaleNeeded)}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handleUploadClick(frame.id)} className="flex-1">
                            <Upload className="w-3.5 h-3.5" aria-hidden="true" /> {t.common.loadImage}
                          </Button>
                          {sharedImage && (
                            <Button variant="secondary" size="sm" onClick={() => handleUseSharedImage(frame.id)} className="flex-1" title={sharedImage.name}>
                              <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" /> {t.wall.useCurrentImage}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>

          {/* Right Column: Wall Preview */}
          <div className="lg:col-span-2 tech-panel-inner tech-panel-inner-corner min-h-[500px] relative flex flex-col overflow-hidden">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-4 p-4 pb-0">
              <h3 className="text-sm uppercase text-text tracking-wider">{t.wall.wallPreview}</h3>
              <Button variant="secondary" size="sm" onClick={handleDownloadPreview}>
                <Download className="w-3.5 h-3.5" aria-hidden="true" /> {t.wall.downloadPreview}
              </Button>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-4 pt-0" ref={wrapperRef}>
              {isCalibrating && (
                <div role="status" className="absolute top-2 left-1/2 -translate-x-1/2 text-accent text-xs uppercase motion-safe:animate-pulse z-10 bg-bg/80 px-2 py-1 border border-accent/50 rounded-sm">
                  {t.wall.calibInstruction}
                </div>
              )}

              <div
                ref={wallRef}
                onClick={handleWallClick}
                onMouseMove={handleWallMouseMove}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleBgDrop}
                className={`relative overflow-hidden ${isCalibrating ? 'cursor-crosshair' : ''} ${!bgImage ? 'bg-bg border border-muted/30 dot-grid' : ''}`}
                style={{
                  width: virtualWallWidth * scale,
                  height: virtualWallHeight * scale,
                }}
              >
                {bgImage && (
                  <img src={bgImage} alt={t.wall.altBg} onLoad={handleImageLoad} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
                )}

                {!bgImage && frames.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center p-4">
                    <p className="text-muted text-xs uppercase bg-bg/50 backdrop-blur-sm px-4 py-2 border border-muted/30 rounded-sm">
                      {t.wall.emptyWall}
                    </p>
                  </div>
                )}

                {/* Calibration Line Overlay */}
                {bgImage && calibStart && calibEnd && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" aria-hidden="true">
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
                  const fallback = defaultUnitPos(frame, index);
                  return (
                    <WallFrame
                      key={frame.id}
                      frame={frame}
                      index={index}
                      unitX={frame.unitX ?? fallback.x}
                      unitY={frame.unitY ?? fallback.y}
                      frameScale={frameScale}
                      isCalibrating={isCalibrating}
                      constraintsRef={wallRef}
                      onDragEnd={commitFramePosition}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Section */}
      <section className="mt-4 p-6 border border-muted/30 bg-panel text-center rounded-sm">
        <h2 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" /> {t.wall.howTitle}
        </h2>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          {t.wall.howBody}
        </p>
        <p className="text-accent text-sm max-w-3xl mx-auto leading-relaxed mt-4 flex gap-2 justify-center">
          <Ruler className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.wall.howTip}</span>
        </p>
      </section>
    </div>
  );
}
