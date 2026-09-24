import React, { useEffect, useState, useCallback } from 'react';
import { GameItem, GameScreenshot } from '../types';
import { X, ChevronLeft, ChevronRight, Maximize2, ExternalLink, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ScreenshotLightboxModalProps {
  game: GameItem;
  screenshots: GameScreenshot[];
  initialIndex?: number;
  onClose: () => void;
}

export const ScreenshotLightboxModal: React.FC<ScreenshotLightboxModalProps> = ({
  game,
  screenshots,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState(false);

  // If no screenshots provided, use fallback array of game's banner and capsule
  const activeScreenshots: GameScreenshot[] = screenshots.length > 0
    ? screenshots
    : [
        { id: 1, thumbnail: game.bannerUrl, full: game.bannerUrl, caption: 'Store Header Art' },
        { id: 2, thumbnail: game.capsuleUrl, full: game.capsuleUrl, caption: 'Store Capsule View' },
        { id: 3, thumbnail: game.posterUrl, full: game.posterUrl, caption: 'Library Vertical Artwork' },
      ];

  const current = activeScreenshots[currentIndex] || activeScreenshots[0];

  const handleNext = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex(prev => (prev + 1) % activeScreenshots.length);
  }, [activeScreenshots.length]);

  const handlePrev = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex(prev => (prev - 1 + activeScreenshots.length) % activeScreenshots.length);
  }, [activeScreenshots.length]);

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#090d16]/90 border-b border-slate-800/80 z-20 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={game.posterUrl}
            alt={game.title}
            className="w-8 h-12 object-cover rounded shadow border border-slate-700/80 shrink-0 hidden sm:block"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">{game.title}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono shrink-0">
                Steam AppID {game.steamAppId}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Screenshot {currentIndex + 1} of {activeScreenshots.length} • HD Capture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={current.full}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="Open original resolution image"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden md:inline">Full Res</span>
          </a>
          <a
            href={game.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="View on Steam Store"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">Steam</span>
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-600/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Navigation Buttons */}
        {activeScreenshots.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700/80 shadow-2xl transition-all cursor-pointer hover:scale-110 active:scale-95"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700/80 shadow-2xl transition-all cursor-pointer hover:scale-110 active:scale-95"
              aria-label="Next screenshot"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Loading Spinner */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Active Screenshot Display */}
        <div className="max-w-6xl max-h-full flex flex-col items-center justify-center relative">
          <img
            key={current.full}
            src={current.full}
            alt={`${game.title} screenshot ${currentIndex + 1}`}
            onLoad={() => setImageLoaded(true)}
            className={`max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 border border-slate-800/80 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-98'
            }`}
          />
          {current.caption && (
            <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              {current.caption}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="px-6 py-4 bg-[#090d16]/90 border-t border-slate-800/80 shrink-0 z-20">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 pb-1 max-w-5xl mx-auto justify-start sm:justify-center">
          {activeScreenshots.map((item, idx) => (
            <button
              key={item.id ?? idx}
              onClick={() => {
                setImageLoaded(false);
                setCurrentIndex(idx);
              }}
              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105 opacity-100'
                  : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-90'
              }`}
            >
              <img
                src={item.thumbnail || item.full}
                alt={`Thumbnail ${idx + 1}`}
                className="w-20 h-12 object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white/90 drop-shadow">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
