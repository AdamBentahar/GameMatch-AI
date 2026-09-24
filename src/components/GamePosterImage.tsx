import React, { useState } from 'react';
import { GameItem } from '../types';
import { ImageOff, Gamepad2 } from 'lucide-react';

interface GamePosterImageProps {
  game: GameItem;
  className?: string;
  alt?: string;
  onClick?: () => void;
  priority?: boolean;
}

export const GamePosterImage: React.FC<GamePosterImageProps> = ({
  game,
  className = '',
  alt,
  onClick,
  priority = false,
}) => {
  const [loadStage, setLoadStage] = useState<'poster' | 'capsule' | 'banner' | 'failed'>('poster');
  const [isLoaded, setIsLoaded] = useState(false);

  const getSourceUrl = () => {
    switch (loadStage) {
      case 'poster':
        return game.posterUrl;
      case 'capsule':
        return game.capsuleUrl || game.bannerUrl;
      case 'banner':
        return game.bannerUrl;
      case 'failed':
      default:
        return '';
    }
  };

  const handleError = () => {
    if (loadStage === 'poster') {
      if (game.capsuleUrl && game.capsuleUrl !== game.posterUrl) {
        setLoadStage('capsule');
      } else if (game.bannerUrl && game.bannerUrl !== game.posterUrl) {
        setLoadStage('banner');
      } else {
        setLoadStage('failed');
      }
    } else if (loadStage === 'capsule') {
      if (game.bannerUrl && game.bannerUrl !== game.capsuleUrl) {
        setLoadStage('banner');
      } else {
        setLoadStage('failed');
      }
    } else {
      setLoadStage('failed');
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const currentSrc = getSourceUrl();

  if (loadStage === 'failed' || !currentSrc) {
    return (
      <div
        onClick={onClick}
        className={`relative w-full h-full bg-gradient-to-br from-slate-900 via-[#121826] to-slate-950 flex flex-col items-center justify-center p-3 text-center border border-slate-800 ${className}`}
        title={`${game.title} (Official artwork offline)`}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-2">
          <Gamepad2 className="w-5 h-5 text-indigo-400/70" />
        </div>
        <p className="text-[11px] font-display font-bold text-slate-200 line-clamp-2 px-1">
          {game.title}
        </p>
        <span className="text-[9px] font-mono text-cyan-400/80 mt-1">
          AppID #{game.steamAppId}
        </span>
        <span className="text-[9px] text-slate-500 mt-0.5">
          Steam Poster Unavailable
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}
    >
      {/* Subtle skeleton shimmer before load */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-slate-700 animate-pulse" />
        </div>
      )}

      <img
        src={currentSrc}
        alt={alt || `${game.title} official poster`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
