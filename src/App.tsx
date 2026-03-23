import { useState, useEffect, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import Navigation from './components/Navigation';
import CookieConsent from './components/CookieConsent';

const QuickScale = lazy(() => import('./components/QuickScale'));
const PrintStudio = lazy(() => import('./components/PrintStudio'));
const WallStudio = lazy(() => import('./components/WallStudio'));

export default function App() {
  const [activeTab, setActiveTab] = useState<'quick' | 'print' | 'wall'>('quick');

  useEffect(() => {
    // If user has accepted cookies, window.clarity will be available
    if (window.clarity) {
      window.clarity('set', 'active_tab', activeTab);
    }
  }, [activeTab]);

  return (
    <Layout>
      <header className="mb-8 text-center pt-4 md:pt-0">
        <h1 className="text-4xl md:text-5xl text-accent font-mono uppercase tracking-widest mb-2 font-light">
          Pixel Ladder
        </h1>
        <h2 className="text-sm md:text-base text-muted font-mono">Neural Image Upscaling Engine</h2>
      </header>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mt-8 flex-grow">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] text-accent gap-4">
            <span className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></span>
            <span className="font-mono text-xs tracking-widest uppercase animate-pulse">Loading Module...</span>
          </div>
        }>
          {activeTab === 'quick' && <QuickScale />}
          {activeTab === 'print' && <PrintStudio />}
          {activeTab === 'wall' && <WallStudio />}
        </Suspense>
      </main>

      <footer className="mt-16 border-t border-accent/20 pt-8 pb-4 text-xs md:text-sm text-muted font-mono">
        <section className="mb-4">
          <h3 className="text-accent mb-2 uppercase tracking-wide">About Pixel Ladder</h3>
          <p className="mb-2">
            Pixel Ladder is a free, browser-based AI tool designed to natively upscale, crop, and prepare your images securely. Our tool employs advanced Neural Network processing (like Real-ESRGAN) entirely in your local browser environment.
          </p>
          <p>
            Whether you are preparing digital art for high-resolution print, calculating DPI for framing, or simply enhancing photos, all processing happens entirely on your local device. 100% private, no uploads or external servers required.
          </p>
        </section>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 mt-8">
          <span>&copy; {new Date().getFullYear()} Pixel Ladder</span>
          <a rel="noopener noreferrer" target="_blank" href="https://github.com/Keizer55/pixel-ladder" className="flex items-center gap-2 hover:text-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            Open Source AI Image Upscaler
          </a>
        </div>
      </footer>

      <CookieConsent />
    </Layout>
  );
}
