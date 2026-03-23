import React, { useState, useEffect, useRef } from 'react';
import { getPrintDimensions, PrintDimensions } from '../lib/PrintCalculator';
import { Printer, Image as ImageIcon, Upload, Scissors, Download, Zap } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
  const [unit, setUnit] = useState<'in' | 'cm'>('cm');
  const [dpi, setDpi] = useState<number>(300);
  const [width, setWidth] = useState<string>('20');
  const [height, setHeight] = useState<string>('30');
  const [dimensions, setDimensions] = useState<PrintDimensions | null>(null);

  // Cropping state
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSize, setImgSize] = useState<{w: number, h: number} | null>(null);
  const [isExactMode, setIsExactMode] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      setImgSize(null);
      setIsExactMode(false);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ w: naturalWidth, h: naturalHeight });
  };

  const wrapperW = isExactMode && dimensions && imgSize ? Math.max(dimensions.widthPx, imgSize.w) : (imgSize?.w || 1);
  const wrapperH = isExactMode && dimensions && imgSize ? Math.max(dimensions.heightPx, imgSize.h) : (imgSize?.h || 1);

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
        <h2 className="text-xl md:text-2xl mb-6 uppercase flex items-center gap-3 text-text font-light tracking-wider">
          <Printer className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          Print Calculator & Crop Studio
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Calculator */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted uppercase text-xs mb-2">Target Width</label>
                <div className="flex">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full bg-bg border border-muted/50 text-text p-2 font-mono text-sm focus:outline-none focus:border-muted rounded-l-sm"
                  />
                  <span className="bg-muted/20 text-muted px-3 py-2 uppercase border border-l-0 border-muted/50 flex items-center text-xs rounded-r-sm">
                    {unit}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-muted uppercase text-xs mb-2">Target Height</label>
                <div className="flex">
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-bg border border-muted/50 text-text p-2 font-mono text-sm focus:outline-none focus:border-muted rounded-l-sm"
                  />
                  <span className="bg-muted/20 text-muted px-3 py-2 uppercase border border-l-0 border-muted/50 flex items-center text-xs rounded-r-sm">
                    {unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted uppercase text-xs mb-2">Unit</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUnit('cm')}
                    className={`flex-1 py-1.5 text-xs uppercase rounded-sm ${
                      unit === 'cm' ? 'tech-button-active' : 'tech-button'
                    }`}
                  >
                    CM
                  </button>
                  <button
                    onClick={() => setUnit('in')}
                    className={`flex-1 py-1.5 text-xs uppercase rounded-sm ${
                      unit === 'in' ? 'tech-button-active' : 'tech-button'
                    }`}
                  >
                    Inches
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-muted uppercase text-xs mb-2">DPI (Resolution)</label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="w-full bg-bg border border-muted/50 text-text p-2 font-mono text-sm focus:outline-none focus:border-muted appearance-none rounded-sm"
                >
                  <option value={150}>150 DPI (Draft)</option>
                  <option value={300}>300 DPI (Standard)</option>
                  <option value={600}>600 DPI (High Quality)</option>
                </select>
              </div>
            </div>

            {dimensions && (
              <div className="tech-panel-inner tech-panel-inner-corner p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-muted to-transparent opacity-50"></div>
                
                <h3 className="text-sm uppercase text-text mb-2 flex items-center gap-2 tracking-wider">
                  <ImageIcon className="w-4 h-4 text-muted" />
                  Required Pixels
                </h3>
                
                <div className="text-2xl md:text-3xl tracking-wider py-2 font-mono">
                  {dimensions.widthPx} <span className="text-muted text-xl">x</span> {dimensions.heightPx} <span className="text-sm text-muted">PX</span>
                </div>
                
                <div className="mt-2 text-muted uppercase text-xs">
                  <p>Aspect Ratio: {aspect.toFixed(2)}:1</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Cropper */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm uppercase text-text flex items-center gap-2 tracking-wider">
                <Scissors className="w-4 h-4 text-muted" />
                Crop Studio
              </h3>
              <div className="flex gap-4">
                {imgSrc && dimensions && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-muted tracking-wider hidden md:inline">Exact Pixel Cut</span>
                    <button 
                      onClick={() => setIsExactMode(!isExactMode)}
                      aria-label="Toggle exact pixel cut mode"
                      className={`relative w-8 h-4 rounded-full transition-colors outline-none focus:outline-none ${
                        isExactMode ? 'bg-accent' : 'bg-muted/30 border border-muted/50'
                      }`}
                    >
                      <div className={`absolute top-[1px] w-3 h-3 rounded-full transition-transform ${
                        isExactMode ? 'translate-x-[15px] bg-bg' : 'translate-x-[1px] bg-muted'
                      }`} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="tech-button px-3 py-1.5 uppercase text-xs flex items-center gap-2 rounded-sm"
                >
                  <Upload className="w-3 h-3" /> Load Image
                </button>
                {imgSrc && completedCrop && (
                  <button 
                    onClick={handleDownloadCrop}
                    className="tech-button border-accent text-accent hover:bg-accent/10 px-3 py-1.5 uppercase text-xs flex items-center gap-2 rounded-sm transition-colors"
                  >
                    <Download className="w-3 h-3" /> Save Crop
                  </button>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={onSelectFile} 
                className="hidden" 
              />
            </div>

            <div className="flex-1 tech-panel-inner tech-panel-inner-corner min-h-[300px] flex items-center justify-center overflow-hidden relative dot-grid">
              {isTooSmall && (
                <div className="absolute top-2 right-2 z-10 bg-red-900/40 border border-red-500/50 text-red-500 text-[10px] uppercase px-2 py-1 rounded-sm shadow-md animate-pulse">
                  Image smaller than required print {dimensions?.widthPx}x{dimensions?.heightPx}px
                </div>
              )}
              
              {!imgSrc ? (
                <p className="text-muted uppercase text-center p-4 text-xs">
                  Load an image to crop it to the exact aspect ratio required for printing.
                </p>
              ) : (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={isExactMode ? undefined : aspect}
                  locked={isExactMode}
                  className="max-h-[400px]"
                >
                  <div className="relative flex items-center justify-center max-h-[400px]">
                    {isExactMode && imgSize ? (
                      <>
                        <img 
                          src={`data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${wrapperW}' height='${wrapperH}'/%3E`}
                          className="max-h-[400px] w-auto max-w-full block opacity-0 pointer-events-none"
                          alt="" aria-hidden="true"
                        />
                        <img
                          ref={imgRef}
                          alt="Image to crop for printing"
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
                        alt="Image to crop for printing"
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
        <h3 className="text-lg text-muted uppercase mb-2 flex items-center justify-center gap-2 tracking-wider">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" /> How Pixel Ladder Print Calculator Works
        </h3>
        <p className="text-muted text-sm max-w-3xl mx-auto leading-relaxed">
          Enter your desired real-world print dimensions (width, height) and DPI (dots per inch) to calculate the <strong>exact pixel resolution</strong> your image needs for high-quality printing.
          Then load a photo into our free Crop Studio to easily crop it to the correct aspect ratio natively in your browser.
          <br/><br/>
          <span className="text-accent/80">
            💡 Tip: Enable "Exact Pixel Cut" to lock the crop selection to the precise pixel dimensions required. If your image is too small to print without losing quality, use our AI Image Upscaler (Quick Scale tab) to increase its resolution first, then come back here to crop.
          </span>
        </p>
      </section>
    </div>
  );
}
