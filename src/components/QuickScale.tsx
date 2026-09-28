import React, { useState, useEffect } from 'react';
import { useUpscaleEngine, UPSCALE_CANCELLED } from '../lib/UpscaleEngine';
import { useWorkspace, dataUrlToBlob, type SharedImage } from '../lib/Workspace';
import { useI18n } from '../i18n/I18nProvider';
import Button, { buttonClasses } from './ui/Button';
import RadioCard from './ui/RadioCard';
import { Upload, Download, Zap, Info } from 'lucide-react';

type ModelType = 'x2' | 'x4' | 'x4-anime' | 'pixel-art';
const MODELS: ModelType[] = ['x2', 'x4', 'x4-anime', 'pixel-art'];
const scaleOf = (m: ModelType) => (m === 'x2' ? 2 : 4);

export default function QuickScale() {
  const { t } = useI18n();
  const { image, setImage, goTo, suggestedScale, clearSuggestedScale, wallReturn, clearWallReturn, deliverToFrame } = useWorkspace();
  // The image being upscaled. Follows the shared image, except for results this
  // tool sent on to Print Studio, so the before/after view stays intact.
  const [input, setInput] = useState<SharedImage | null>(null);
  const [modelType, setModelType] = useState<ModelType>('x2');
  const [result, setResult] = useState<{ url: string; width: number; height: number; timeMs: number; model: ModelType } | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const { upscaleImage, cancel, isProcessing, progress, error } = useUpscaleEngine();

  useEffect(() => {
    if (image?.origin === 'quick-result') return;
    cancel();
    setInput(image);
    setResult(null);
    setZoomPos({ x: 50, y: 50 });
  }, [image]);

  // Coming from a low-resolution warning: preselect a model big enough.
  useEffect(() => {
    if (suggestedScale === null) return;
    if (suggestedScale > 2) {
      if (scaleOf(modelType) < 4) setModelType('x4');
    } else {
      setModelType('x2');
    }
    clearSuggestedScale();
  }, [suggestedScale]);

  const loadFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      clearWallReturn();
      setImage(file, file.name, 'quick');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    loadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  const handleProcess = async () => {
    if (!input) return;
    setAnnouncement(t.quick.processing);
    try {
      const res = await upscaleImage(input.blob, modelType);
      setResult({
        url: res.imageUrl,
        width: res.width,
        height: res.height,
        timeMs: res.timeMs,
        model: modelType,
      });
      setZoomPos({ x: 50, y: 50 });
      setAnnouncement(t.quick.done(res.width, res.height));
    } catch (err) {
      if (err instanceof Error && err.name === UPSCALE_CANCELLED) {
        setAnnouncement(t.quick.cancelled);
      } else {
        console.error(err);
      }
    }
  };

  const handleUseInPrint = async () => {
    if (!result) return;
    const baseName = input?.name.replace(/\.[^.]+$/, '') ?? 'image';
    await setImage(dataUrlToBlob(result.url), `${baseName}-${result.model}.png`, 'quick-result');
    clearWallReturn();
    goTo('print');
  };

  const handleReplaceInFrame = () => {
    if (!result || !wallReturn) return;
    deliverToFrame({ frameId: wallReturn.frameId, dataUrl: result.url, width: result.width, height: result.height });
    clearWallReturn();
    goTo('wall');
  };

  const updateZoomPos = (clientX: number, clientY: number, currentTarget: EventTarget & HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    updateZoomPos(e.clientX, e.clientY, e.currentTarget);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    updateZoomPos(touch.clientX, touch.clientY, e.currentTarget);
  };

  const outputSize = (m: ModelType) =>
    input ? `${input.width * scaleOf(m)} × ${input.height * scaleOf(m)} px` : null;

  return (
    <div className="flex flex-col gap-8">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Column: Controls */}
        <div className="flex flex-col gap-6">
          {/* Step 1: image */}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-sm uppercase tracking-wider text-text">
              <span className="text-accent">1</span> · {t.quick.step1}
            </h2>
            {input ? (
              <div className="flex items-center gap-4 p-3 border border-border rounded-sm">
                <img
                  src={input.url}
                  alt=""
                  className="w-24 h-18 object-cover border border-muted/30 shrink-0"
                />
                <div className="flex flex-col gap-1 min-w-0 flex-grow">
                  <span className="text-sm truncate">{input.name}</span>
                  <span className="text-xs text-muted">{input.width} × {input.height} px</span>
                </div>
                <label className={buttonClasses({ variant: 'secondary', size: 'md', className: 'dropzone cursor-pointer shrink-0' })}>
                  {t.quick.change}
                  <input type="file" onChange={handleFileSelect} accept="image/*" className="sr-only" />
                </label>
              </div>
            ) : (
              <label
                className={`dropzone border-2 border-dashed p-8 text-center cursor-pointer transition-colors rounded-sm flex flex-col items-center gap-2 ${
                  isDragging ? 'border-accent bg-accent-dim' : 'border-border hover:bg-accent-dim'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input type="file" onChange={handleFileSelect} accept="image/*" className="sr-only" />
                <Upload className="w-10 h-10 text-muted mb-2" aria-hidden="true" />
                <span className="text-base">{t.quick.drop}</span>
                <span className="text-sm text-muted">{t.quick.dropFormats}</span>
              </label>
            )}
          </div>

          {/* Step 2: model */}
          <fieldset className="tech-panel-inner tech-panel-inner-corner p-4 flex flex-col gap-3">
            <legend className="sr-only">{t.quick.step2}</legend>
            <h2 className="text-sm uppercase tracking-wider text-text" aria-hidden="true">
              <span className="text-accent">2</span> · {t.quick.step2}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODELS.map((m) => (
                <RadioCard
                  key={m}
                  name="upscale-model"
                  value={m}
                  checked={modelType === m}
                  onChange={(v) => setModelType(v as ModelType)}
                  title={t.quick.models[m].name}
                  description={t.quick.models[m].desc}
                  detail={outputSize(m) ? `→ ${outputSize(m)}` : undefined}
                />
              ))}
            </div>
          </fieldset>

          {/* Step 3: action */}
          <div className="flex flex-col gap-2">
            {isProcessing ? (
              <div className="flex gap-2 items-stretch">
                <div
                  role="progressbar"
                  aria-label={t.quick.progressLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="relative flex-grow h-13 border border-accent rounded-sm overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 bg-accent-dim transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  <div className="relative h-full flex items-center justify-center gap-3 text-accent uppercase tracking-widest text-sm">
                    <Zap className="w-5 h-5" aria-hidden="true" />
                    <span>{t.quick.processing}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
                <Button variant="secondary" size="lg" onClick={cancel}>{t.common.cancel}</Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleProcess}
                disabled={!input}
                aria-describedby="quick-cta-help"
                className="w-full"
              >
                <Zap className="w-5 h-5" aria-hidden="true" />
                {t.quick.upscaleNow}
              </Button>
            )}
            <p id="quick-cta-help" className="text-sm text-muted text-center">
              {input ? (
                <>{t.quick.output} <span className="text-text">{outputSize(modelType)}</span></>
              ) : t.quick.ctaHelp}
            </p>
          </div>

          {error && <p className="text-danger text-sm" role="alert">{t.quick.failed(error)}</p>}
        </div>

        {/* Right Column: Preview */}
        <div className="tech-panel-inner tech-panel-inner-corner p-4 flex flex-col">
          <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-sm uppercase text-text tracking-wider">{t.quick.preview}</h2>
            <span className="flex items-center gap-3">
              {/* Resolution badge */}
              {result && input ? (
                <span className="text-accent text-xs font-mono">
                  {input.width} × {input.height} → {result.width} × {result.height} px
                </span>
              ) : input ? (
                <span className="text-muted text-xs font-mono">
                  {input.width} × {input.height} px
                </span>
              ) : null}
              {result && (
                <a
                  href={result.url}
                  download={`upscaled-${result.model}.png`}
                  className={buttonClasses({ variant: 'primary', size: 'md' })}
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {t.quick.download}
                </a>
              )}
            </span>
          </div>

          <div className="flex-1 bg-bg border border-muted/30 relative min-h-[300px] flex items-center justify-center overflow-hidden p-2">
            <div className="absolute inset-0 dot-grid pointer-events-none"></div>

            {isProcessing && <div className="absolute inset-0 bg-bg/60 z-20" aria-hidden="true" />}

            {result ? (
              <div
                className="relative cursor-crosshair flex items-center justify-center h-[360px] max-w-[90%] bg-white rounded-sm drop-shadow-xl z-10 p-2"
              >
                <img
                  src={result.url}
                  alt={t.quick.altResult}
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
            ) : input ? (
              <div className="relative flex items-center justify-center h-[360px] max-w-[90%] bg-white rounded-sm drop-shadow-xl z-10 p-2">
                <img
                  src={input.url}
                  alt={t.quick.altOriginal}
                  className="max-w-full max-h-full block"
                />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                <img
                  src="/cerdito_1.jpg"
                  alt=""
                  className="w-64 max-w-full h-auto border border-muted/30 bg-white"
                />
                <p className="text-muted">{t.quick.noImage}</p>
              </div>
            )}
          </div>

          {/* Next steps */}
          {result && (
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {wallReturn && (
                <Button variant="primary" size="md" onClick={handleReplaceInFrame}>
                  {t.quick.replaceInFrame(wallReturn.frameNumber)}
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={handleUseInPrint}>
                {t.quick.useInPrint}
              </Button>
            </div>
          )}

          {/* Zoom Comparison Section */}
          {result && input && (
            <div className="mt-4 flex flex-col gap-2">
              <h3 className="text-sm uppercase text-accent border-b border-accent/20 pb-1">{t.quick.comparisonTitle}</h3>
              <p className="text-xs text-muted">{t.quick.comparisonHint}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted uppercase text-center">{t.quick.original} ({input.width}×{input.height})</span>
                  <div
                    className="w-full aspect-square bg-white border border-border bg-no-repeat"
                    style={{
                      backgroundImage: `url(${input.url})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: '800%',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-accent uppercase text-center">{t.quick.upscaled} ({result.width}×{result.height})</span>
                  <div
                    className="w-full aspect-square bg-white border border-accent bg-no-repeat"
                    style={{
                      backgroundImage: `url(${result.url})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: '800%',
                      imageRendering: result.model === 'pixel-art' ? 'pixelated' : 'auto'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-muted">{t.quick.time(result.timeMs)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Explanation Section */}
      <section className="mt-4 p-6 border border-muted/30 bg-panel text-center rounded-sm">
        <h2 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" /> {t.quick.howTitle}
        </h2>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          {t.quick.howBody}
        </p>
        <p className="text-accent text-sm max-w-3xl mx-auto leading-relaxed mt-4 flex gap-2 justify-center">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.quick.howNote}</span>
        </p>
      </section>
    </div>
  );
}
