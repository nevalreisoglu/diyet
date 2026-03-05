import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';

const DISMISSED_KEY = 'ios-install-banner-dismissed';

function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 animate-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        {/* App icon + title */}
        <div className="flex items-center gap-3 mb-3 pr-6">
          <img
            src="/icons/apple-touch-icon.png"
            alt="Beslenme Günlüğü"
            className="w-12 h-12 rounded-xl shadow-sm"
          />
          <div>
            <p className="font-semibold text-sm text-gray-900">Beslenme Günlüğü</p>
            <p className="text-xs text-gray-500">Ana ekrana ekle</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
            <span>Alttaki</span>
            <span className="inline-flex items-center gap-1 bg-gray-100 rounded px-1.5 py-0.5 text-xs font-medium">
              <Share className="h-3 w-3" /> Paylaş
            </span>
            <span>butonuna dokun</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
            <span><strong>"Ana Ekrana Ekle"</strong> seçeneğini seç</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
            <span>Sağ üstteki <strong>"Ekle"</strong> butonuna dokun</span>
          </div>
        </div>

        {/* Arrow pointing to share button */}
        <div className="flex justify-center mt-3">
          <div className="flex flex-col items-center text-green-500 animate-bounce">
            <div className="w-0.5 h-5 bg-green-400 rounded-full" />
            <svg viewBox="0 0 16 10" className="w-4 h-3 fill-green-500">
              <polygon points="0,0 16,0 8,10" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
