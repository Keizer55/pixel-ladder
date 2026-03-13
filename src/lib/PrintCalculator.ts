export function calculatePixels(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

export function calculateInches(pixels: number, dpi: number): number {
  return pixels / dpi;
}

export function calculateCm(inches: number): number {
  return inches * 2.54;
}

export function calculateInchesFromCm(cm: number): number {
  return cm / 2.54;
}

export interface PrintDimensions {
  widthPx: number;
  heightPx: number;
  widthIn: number;
  heightIn: number;
  widthCm: number;
  heightCm: number;
  dpi: number;
}

export function getPrintDimensions(
  width: number,
  height: number,
  unit: 'px' | 'in' | 'cm',
  dpi: number
): PrintDimensions {
  let widthPx = 0;
  let heightPx = 0;
  let widthIn = 0;
  let heightIn = 0;

  if (unit === 'px') {
    widthPx = width;
    heightPx = height;
    widthIn = calculateInches(width, dpi);
    heightIn = calculateInches(height, dpi);
  } else if (unit === 'in') {
    widthIn = width;
    heightIn = height;
    widthPx = calculatePixels(width, dpi);
    heightPx = calculatePixels(height, dpi);
  } else if (unit === 'cm') {
    widthIn = calculateInchesFromCm(width);
    heightIn = calculateInchesFromCm(height);
    widthPx = calculatePixels(widthIn, dpi);
    heightPx = calculatePixels(heightIn, dpi);
  }

  return {
    widthPx,
    heightPx,
    widthIn,
    heightIn,
    widthCm: calculateCm(widthIn),
    heightCm: calculateCm(heightIn),
    dpi,
  };
}
