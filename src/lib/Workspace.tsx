import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type Tab = 'quick' | 'print' | 'wall';

// The image the three tools share: loading it in one tool makes it available
// in the others, so the user never has to re-upload between steps.
export interface SharedImage {
  id: number;
  blob: Blob;
  url: string;
  name: string;
  width: number;
  height: number;
  // Which tool produced it. Quick Scale ignores its own results so its
  // before/after view survives sending a result on to Print Studio.
  origin: Tab | 'quick-result';
}

// Where an upscaled result should go back to once Quick Scale finishes.
export interface WallReturnTarget {
  frameId: string;
  frameNumber: number;
}

// An upscaled image on its way back to a Wall Setup frame.
export interface FrameDelivery {
  frameId: string;
  dataUrl: string;
  width: number;
  height: number;
}

interface UpscaleRequest {
  // Upscale factor needed to reach the target size; picks X2 or X4.
  minScale: number;
  // Image to upscale when it is not already the shared image.
  source?: { blob: Blob; name: string; origin: Tab };
  returnTo?: WallReturnTarget;
}

interface WorkspaceContextValue {
  activeTab: Tab;
  goTo: (tab: Tab) => void;
  image: SharedImage | null;
  setImage: (blob: Blob, name: string, origin: SharedImage['origin']) => Promise<void>;
  requestUpscale: (request: UpscaleRequest) => Promise<void>;
  suggestedScale: number | null;
  clearSuggestedScale: () => void;
  wallReturn: WallReturnTarget | null;
  clearWallReturn: () => void;
  frameDelivery: FrameDelivery | null;
  deliverToFrame: (delivery: FrameDelivery) => void;
  clearFrameDelivery: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

// Decodes a data: URL without fetch(), which the CSP's connect-src blocks for data: URLs.
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('quick');
  const [image, setImageState] = useState<SharedImage | null>(null);
  const [suggestedScale, setSuggestedScale] = useState<number | null>(null);
  const [wallReturn, setWallReturn] = useState<WallReturnTarget | null>(null);
  const [frameDelivery, setFrameDelivery] = useState<FrameDelivery | null>(null);
  const nextId = useRef(1);

  // Object URLs are not revoked on replace: Quick Scale may still be showing
  // the previous image next to its result.
  const setImage = useCallback(async (blob: Blob, name: string, origin: SharedImage['origin']) => {
    const url = URL.createObjectURL(blob);
    const { width, height } = await readDimensions(url);
    setImageState({ id: nextId.current++, blob, url, name, width, height, origin });
  }, []);

  const requestUpscale = useCallback(async ({ minScale, source, returnTo }: UpscaleRequest) => {
    if (source) await setImage(source.blob, source.name, source.origin);
    setSuggestedScale(minScale);
    setWallReturn(returnTo ?? null);
    setActiveTab('quick');
  }, [setImage]);

  const value: WorkspaceContextValue = {
    activeTab,
    goTo: setActiveTab,
    image,
    setImage,
    requestUpscale,
    suggestedScale,
    clearSuggestedScale: () => setSuggestedScale(null),
    wallReturn,
    clearWallReturn: () => setWallReturn(null),
    frameDelivery,
    deliverToFrame: setFrameDelivery,
    clearFrameDelivery: () => setFrameDelivery(null),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
