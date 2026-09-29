import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getPrintDimensions, PrintDimensions } from '../lib/PrintCalculator';
import { Printer, Image as ImageIcon, Upload, Scissors, Download, Zap, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useI18n } from '../i18n/I18nProvider';
import { useWorkspace } from '../lib/Workspace';
import Button, { buttonClasses } from './ui/Button';
import ChoiceGroup from './ui/ChoiceGroup';
import ResolutionAlert, { formatScale } from './ui/ResolutionAlert';

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function PrintStudio() {
  const { t } = useI18n();
  const { image, setImage, requestUpscale } = useWorkspace();
  const [unit, setUnit] = useState<'in' | 'cm'>('cm');
  const [dpi, setDpi] = useState<number>(300);
  const [width, setWidth] = useState<string>('20');
  const [height, setHeight] = useState<string>('30');
  const [dimensions, setDimensions] = useState<PrintDimensions | null>(null);

  // Cropping state. The image is the one shared by all tools.
  const imgSrc = image?.url ?? '';
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSize, setImgSize] = useState<{w: number, h: number} | null>(null);
  const [isExactMode, setIsExactMode] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  // The element ReactCrop measures (its child); percent crops are relative to it.
  const mediaRef = useRef<HTMLDivElement>(null);

  // Crops set in code (new aspect ratio, exact mode, new image) never fire
  // onComplete, so derive the pixel crop here to keep the crop size, the
  // low-resolution warning and "Save crop" in sync with what is on screen.
  useEffect(() => {
    if (!crop) return;
    const frame = requestAnimationFrame(() => {
      const media = mediaRef.current;
      if (!media || !media.offsetWidth || !media.offsetHeight) return;
      setCompletedCrop(convertToPixelCrop(crop, media.offsetWidth, media.offsetHeight));
    });
    return () => cancelAnimationFrame(frame);
  }, [crop]);

  // A new shared image (loaded here or sent from another tool) starts a fresh crop.
  // Layout effect: it must run before the new <img> can fire onLoad, or the
  // reset would wipe the size that onLoad just stored.
  useLayoutEffect(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setImgSize(null);
    setIsExactMode(false);
  }, [image?.id]);

  useEffect(() => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      setDimensions(getPrintDimensions(w, h, unit, dpi));
    } else {
      setDimensions(null);
    }
  }, [width, height, unit, dpi]);

  const aspect = dimensions ? dimensions.widthPx / dimensions.heightPx : 1;

  const formatAspectRatio = (ratio: number) => {
    if (!Number.isFinite(ratio) || ratio <= 0) return '—';
    const rounded = Math.round(ratio);
    if (Math.abs(ratio - rounded) < 0.005) {
      return `${rounded}:1`;
    }
    return `${ratio.toFixed(2)}:1.00`;
  };

  // Update crop when aspect ratio, exact mode, or image changes
  useEffect(() => {
    if (imgSize) {
      if (isExactMode && dimensions) {
        const { widthPx, heightPx } = dimensions;
        const imgWidth = imgSize.w;
        const imgHeight = imgSize.h;

        if (imgWidth < widthPx || imgHeight < heightPx) {
          // It will show a larger crop box natively since we pad the wrapper
          console.warn("Image is smaller than the required print pixels.");
        }

        const wrapperW = Math.max(imgWidth, widthPx);
        const wrapperH = Math.max(imgHeight, heightPx);

        const percentWidth = (widthPx / wrapperW) * 100;
        const percentHeight = (heightPx / wrapperH) * 100;
        
        setCrop({
          unit: '%',
          x: (100 - percentWidth) / 2,
          y: (100 - percentHeight) / 2,
          width: percentWidth,
          height: percentHeight
        });
      } else {
        setCrop(centerAspectCrop(imgSize.w, imgSize.h, aspect));
      }
    }
  }, [aspect, imgSize, isExactMode, dimensions]);

  // Red warning state
  const isTooSmall = isExactMode && imgSize && dimensions && (imgSize.w < dimensions.widthPx || imgSize.h < dimensions.heightPx);

  const loadFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) setImage(file, file.name, 'print');
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    loadFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ w: naturalWidth, h: naturalHeight });
  };

  const wrapperW = isExactMode && dimensions && imgSize ? Math.max(dimensions.widthPx, imgSize.w) : (imgSize?.w || 1);
  const wrapperH = isExactMode && dimensions && imgSize ? Math.max(dimensions.heightPx, imgSize.h) : (imgSize?.h || 1);

  const cropPixelSize = (() => {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) return null;
    if (isExactMode && dimensions) {
      return { w: dimensions.widthPx, h: dimensions.heightPx };
    }
    const image = imgRef.current;
    if (!image.width || !image.height) return null;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    return {
      w: Math.max(1, Math.round(completedCrop.width * scaleX)),
      h: Math.max(1, Math.round(completedCrop.height * scaleY))
    };
  })();

  const isCropTooSmall = !!(dimensions && cropPixelSize && (cropPixelSize.w < dimensions.widthPx || cropPixelSize.h < dimensions.heightPx));
  // Upscale factor the crop needs to reach the print size.
  const cropScaleNeeded = dimensions && cropPixelSize
    ? Math.max(dimensions.widthPx / cropPixelSize.w, dimensions.heightPx / cropPixelSize.h)
    : 1;

  const handleDownloadCrop = () => {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) return;

    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    
    // Scale crop values based on the rendered image vs its natural sizes
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // If exact mode is used, we need to respect the exact pixel request
    const outputW = isExactMode && dimensions ? dimensions.widthPx : completedCrop.width * scaleX;
    const outputH = isExactMode && dimensions ? dimensions.heightPx : completedCrop.height * scaleY;
    
    canvas.width = outputW;
    canvas.height = outputH;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputW,
      outputH
    );
    
    const base64Image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = 'pixel-ladder-crop.png';
    link.click();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="tech-panel-inner tech-panel-inner-corner p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Calculator */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl md:text-2xl uppercase flex items-center gap-3 text-text font-light tracking-wider">
              <Printer className="w-5 h-5 md:w-6 md:h-6 text-accent" aria-hidden="true" />
              {t.print.title}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="print-width" className="block text-muted uppercase text-xs mb-2">{t.print.targetWidth}</label>
                <div className="flex">
                  <input
                    id="print-width"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full bg-bg border border-border text-text p-2 font-mono text-sm rounded-l-sm"
                  />
                  <span className="bg-muted/20 text-muted px-3 py-2 uppercase border border-l-0 border-border flex items-center text-xs rounded-r-sm">
                    {unit}
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="print-height" className="block text-muted uppercase text-xs mb-2">{t.print.targetHeight}</label>
                <div className="flex">
                  <input
                    id="print-height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-bg border border-border text-text p-2 font-mono text-sm rounded-l-sm"
                  />
                  <span className="bg-muted/20 text-muted px-3 py-2 uppercase border border-l-0 border-border flex items-center text-xs rounded-r-sm">
                    {unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-muted uppercase text-xs mb-2" aria-hidden="true">{t.print.unit}</span>
                <ChoiceGroup
                  label={t.print.unit}
                  value={unit}
                  onChange={setUnit}
                  options={[{ value: 'cm', label: t.print.cm }, { value: 'in', label: t.print.inches }]}
                  optionClassName="flex-1 h-10 text-xs"
                />
              </div>
              <div>
                <label htmlFor="print-dpi" className="block text-muted uppercase text-xs mb-2">{t.print.dpi}</label>
                <select
                  id="print-dpi"
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full h-10 bg-bg border border-border text-text px-2 font-mono text-sm appearance-none rounded-sm"
                >
                  <option value={150}>{t.print.dpiDraft}</option>
                  <option value={300}>{t.print.dpiStandard}</option>
                  <option value={600}>{t.print.dpiHigh}</option>
                </select>
              </div>
            </div>

            {dimensions && (
              <div className="tech-panel-inner tech-panel-inner-corner p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-muted to-transparent opacity-50" aria-hidden="true"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-muted uppercase text-xs leading-relaxed flex flex-col justify-start">
                    <h3 className="text-sm uppercase text-text mb-2 flex items-center gap-2 tracking-wider">
                      <ImageIcon className="w-4 h-4 text-muted" aria-hidden="true" />
                      {t.print.requiredPixels}
                    </h3>
                    <div>{t.print.targetPrintSize} <span className="text-text tracking-wider">{width} x {height} {unit}</span></div>
                    <div className="mt-2">
                      <div>{t.print.resolutionAt(dpi)}</div>
                      <div className="text-text text-base md:text-lg font-mono tracking-wider pl-4 mt-1">
                        {dimensions.widthPx} <span className="text-muted mx-1">x</span> {dimensions.heightPx} <span className="text-xs text-muted ml-1">PX</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-muted uppercase text-xs leading-relaxed md:text-right flex flex-col justify-start">
                    <h3 className="text-sm uppercase text-text mb-2 flex items-center md:justify-end gap-2 tracking-wider">
                      <Info className="w-4 h-4 text-muted" aria-hidden="true" />
                      {t.print.imageDetails}
                    </h3>
                    <div>{t.print.aspectRatio} <span className="text-text">{formatAspectRatio(aspect)}</span></div>
                    {imgSize && (
                      <div>{t.print.imageSize} <span className="text-text">{imgSize.w} x {imgSize.h} px</span></div>
                    )}
                    {cropPixelSize && (
                      <div>{t.print.cropSize} <span className="text-text">{cropPixelSize.w} x {cropPixelSize.h} px</span></div>
                    )}
                  </div>
                </div>

                {isCropTooSmall && cropPixelSize && (
                  <div role="status" className="mt-4">
                    <ResolutionAlert
                      lead={t.common.lowResolution}
                      detail={t.print.lowResDetail(cropPixelSize.w, cropPixelSize.h, width, height, unit, dpi, dimensions.widthPx, dimensions.heightPx)}
                      actionLabel={t.common.upscaleInQuickScale}
                      onAction={() => requestUpscale({ minScale: cropScaleNeeded })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Cropper */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm uppercase text-text flex items-center gap-2 tracking-wider">
                <Scissors className="w-4 h-4 text-muted" aria-hidden="true" />
                {t.print.cropStudio}
              </h3>
              <div className="flex gap-2 flex-wrap items-center">
                {imgSrc && dimensions && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isExactMode}
                    onClick={() => setIsExactMode(!isExactMode)}
                    className="h-8 flex items-center gap-2 px-1 rounded-sm text-xs uppercase text-muted tracking-wider"
                  >
                    <span>{t.print.exactPixelCut}</span>
                    <span
                      aria-hidden="true"
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        isExactMode ? 'bg-accent' : 'bg-muted/20 border border-border'
                      }`}
                    >
                      <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full transition-transform ${
                        isExactMode ? 'translate-x-[18px] bg-bg' : 'translate-x-[2px] bg-muted'
                      }`} />
                    </span>
                  </button>
                )}
                <label className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'dropzone cursor-pointer' })}>
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" /> {t.common.loadImage}
                  <input type="file" accept="image/*" onChange={onSelectFile} className="sr-only" />
                </label>
                {imgSrc && completedCrop && (
                  <Button variant="secondary" size="sm" onClick={handleDownloadCrop}>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> {t.print.saveCrop}
                  </Button>
                )}
              </div>
            </div>

            <div
              className={`flex-1 bg-bg border relative min-h-[300px] flex items-center justify-center overflow-hidden p-2 transition-colors ${
                isDragging ? 'border-accent' : 'border-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="absolute inset-0 dot-grid pointer-events-none"></div>
              {isTooSmall && dimensions && (
                <div className="absolute top-2 right-2 z-10 bg-panel border border-danger text-danger text-xs px-2 py-1 rounded-sm shadow-md flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {t.print.imageSmaller(dimensions.widthPx, dimensions.heightPx)}
                </div>
              )}

              {!imgSrc ? (
                <label
                  className={`dropzone flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors w-full h-full relative ${
                    isDragging ? 'bg-accent-dim' : 'hover:bg-accent-dim'
                  }`}
                >
                  <input type="file" accept="image/*" onChange={onSelectFile} className="sr-only" />
                  <Upload className="w-10 h-10 text-muted mx-auto mb-4" aria-hidden="true" />
                  <span className="text-base mb-2">{t.print.dropTitle}</span>
                  <span className="text-sm text-muted max-w-sm">{t.print.dropDesc}</span>
                </label>
              ) : (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={isExactMode ? undefined : aspect}
                  locked={isExactMode}
                  className="max-h-[400px]"
                >
                  <div ref={mediaRef} className="relative flex items-center justify-center max-h-[400px]">
                    {isExactMode && imgSize ? (
                      <>
                        <img
                          src={`data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${wrapperW}' height='${wrapperH}'/%3E`}
                          className="max-h-[400px] w-auto max-w-full block opacity-0 pointer-events-none"
                          alt="" aria-hidden="true"
                        />
                        <img
                          ref={imgRef}
                          alt={t.print.altCrop}
                          src={imgSrc}
                          onLoad={onImageLoad}
                          className="absolute pointer-events-none inset-0 m-auto"
                          style={{
                            width: `${(imgSize.w / wrapperW) * 100}%`,
                            height: `${(imgSize.h / wrapperH) * 100}%`,
                            objectFit: 'contain'
                          }}
                        />
                      </>
                    ) : (
                      <img
                        ref={imgRef}
                        alt={t.print.altCrop}
                        src={imgSrc}
                        onLoad={onImageLoad}
                        className="max-h-[400px] w-auto max-w-full object-contain block"
                      />
                    )}
                  </div>
                </ReactCrop>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Section */}
      <section className="mt-4 p-6 border border-muted/30 bg-panel text-center rounded-sm">
        <h2 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" /> {t.print.howTitle}
        </h2>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          {t.print.howBody}
        </p>
        <p className="text-accent text-sm max-w-3xl mx-auto leading-relaxed mt-4 flex gap-2 justify-center">
          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.print.howTip}</span>
        </p>
      </section>
    </div>
  );
}
