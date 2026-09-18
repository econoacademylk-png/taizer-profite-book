import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, CheckCircle2, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Lock body scroll when iOS guide modal is open
  useEffect(() => {
    if (showIosGuide) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showIosGuide]);

  // If running in standalone app mode, don't show install button
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Fallback instruction for browsers where prompt hasn't fired yet
      alert('To install Taizer Profit Book:\n\n• On Chrome/Edge (Desktop): Click the install icon in the URL address bar or select Menu > "Install Taizer Profit Book".\n• On Phone: Tap the browser menu (3 dots) > "Install app" or "Add to Home Screen".');
    }
  };

  return (
    <>
      {/* Navbar Install Button */}
      <button
        id="pwa-install-btn"
        onClick={handleInstallClick}
        className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer animate-pulse hover:animate-none shrink-0"
        title="Install Taizer Profit Book on this Device (Desktop or Mobile)"
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span className="hidden xs:inline sm:inline">Install App</span>
        <span className="xs:hidden sm:hidden">Install</span>
      </button>

      {/* Installed Success Toast rendered in Portal to escape header z-index */}
      {installedSuccess && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-[100] p-4 rounded-2xl bg-stone-900 text-white shadow-2xl border border-emerald-500/50 flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-400">App Installed Successfully!</p>
            <p className="text-stone-300">You can now open Taizer Crypto directly from your Home Screen or Desktop.</p>
          </div>
        </div>,
        document.body
      )}

      {/* iOS Install Instruction Modal rendered in Portal to escape header z-index */}
      {showIosGuide && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowIosGuide(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-stone-200 my-auto animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-stone-600">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  In Safari, tap the <strong>Share</strong> button (the square with an arrow pointing up <Share className="w-3.5 h-3.5 inline text-blue-600" />) at the bottom.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Scroll down the options list and select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Tap <strong>"Add"</strong> at the top right. Taizer Profit Book will appear on your phone screen as a standalone app!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
