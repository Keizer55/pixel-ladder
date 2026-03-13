import { useState } from 'react';
import Layout from './components/Layout';
import Navigation from './components/Navigation';
import QuickScale from './components/QuickScale';
import PrintStudio from './components/PrintStudio';
import WallStudio from './components/WallStudio';
import CookieConsent from './components/CookieConsent';

export default function App() {
  const [activeTab, setActiveTab] = useState<'quick' | 'print' | 'wall'>('quick');

  return (
    <Layout>
      <header className="mb-8 text-center pt-4 md:pt-0">
        <h1 className="text-4xl md:text-5xl text-accent font-mono uppercase tracking-widest mb-2 font-light">
          Pixel Ladder
        </h1>
        <p className="text-sm md:text-base text-muted font-mono">Neural Image Upscaling Engine</p>
      </header>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mt-8">
        {activeTab === 'quick' && <QuickScale />}
        {activeTab === 'print' && <PrintStudio />}
        {activeTab === 'wall' && <WallStudio />}
      </main>

      <CookieConsent />
    </Layout>
  );
}
