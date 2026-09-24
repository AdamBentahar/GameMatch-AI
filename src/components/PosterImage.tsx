import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface PosterImageProps {
  posterUrl: string;
  capsuleUrl?: string;
  bannerUrl?: string;
  title: string;
  steamAppId: number;
  className?: string;
  aspectRatio?: string;
  loading?: 'lazy' | 'eager';
}

export const PosterImage: React.FC<PosterImageProps> = ({
  posterUrl,
  capsuleUrl,
  bannerUrl,
  title,
  steamAppId,
  className = 'w-full h-full object-cover',
  aspectRatio = 'aspect-[2/3]',
  loading = 'lazy',
}) => {
  const [stage, setStage] = useState<'poster' | 'capsule' | 'banner' | 'fallback'>('poster');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = () => {
    if (stage === 'poster') {
      if (capsuleUrl && capsuleUrl !== posterUrl) {
        setStage('capsule');
      } else if (bannerUrl && bannerUrl !== posterUrl) {
        setStage('banner');
      } else {
        setStage('fallback');
      }
    } else if (stage === 'capsule') {
      if (bannerUrl && bannerUrl !== capsuleUrl) {
        setStage('banner');
      } else {
        setStage('fallback');
      }
    } else {
      setStage('fallback');
    }
  };

  const getSource = () => {
    switch (stage) {
      case 'poster':
        return posterUrl;
      case 'capsule':
        return capsuleUrl || bannerUrl || posterUrl;
      case 'banner':
        return bannerUrl || posterUrl;
      default:
        return '';
    }
  };

  if (stage === 'fallback') {
    return (
      <div className={`relative w-full ${aspectRatio} bg-[#0b0e14] border border-slate-800 flex flex-col items-center justify-center p-3 text-center overflow-hidden`}>
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-2">
          <ImageIcon className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-xs font-semibold text-slate-200 line-clamp-2 px-1">{title}</p>
        <span className="text-[10px] font-mono text-cyan-400/80 mt-1">App #{steamAppId}</span>
        <span className="text-[9px] text-slate-500 mt-1 uppercase font-mono tracking-wider">Image Unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectRatio} bg-slate-950 overflow-hidden`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-900/80 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-700" />
        </div>
      )}
      <img
        src={getSource()}
        alt={`${title} cover`}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
