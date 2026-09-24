import React from 'react';
import { GameItem } from '../types';
import { X, ExternalLink, Sparkles, ThumbsUp, Calendar, Clock, BookmarkPlus, Check } from 'lucide-react';
import { GamePosterImage } from './GamePosterImage';

interface PosterModalProps {
  game: GameItem | null;
  onClose: () => void;
  onOpenDetails?: (game: GameItem) => void;
  isSavedInBacklog?: boolean;
  onToggleBacklog?: (game: GameItem) => void;
}

export const PosterModal: React.FC<PosterModalProps> = ({
  game,
  onClose,
  onOpenDetails,
  isSavedInBacklog = false,
  onToggleBacklog,
}) => {
  if (!game) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full rounded-2xl bg-[#0f1422] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          title="Close poster view"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Poster Artwork Showcase */}
        <div className="relative md:w-1/2 aspect-[2/3] shrink-0 bg-slate-950 overflow-hidden flex items-center justify-center">
          <GamePosterImage
            game={game}
            alt={`${game.title} official poster`}
            priority={true}
            className="w-full h-full object-cover object-center shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1422] via-transparent to-transparent md:hidden pointer-events-none" />
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
            Steam AppID #{game.steamAppId}
          </div>
        </div>

        {/* Poster Details & Actions */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Original Steam Library Poster (600×900)</span>
            </div>

            <div>
              <h3 className="text-2xl font-display font-extrabold text-white tracking-wide leading-tight">
                {game.title}
              </h3>
              <p className="text-slate-400 text-xs mt-1 italic">
                "{game.tagline}"
              </p>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">REVIEWS</span>
                <span className="text-cyan-300 font-semibold flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {game.reviewPercentage}% ({game.reviewSentiment})
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">PLAYTIME</span>
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{game.mainStoryPlaytime}h story
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">RELEASE</span>
                <span className="text-slate-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  {game.releaseYear}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">PRICE</span>
                <span className="text-emerald-400 font-semibold">
                  {game.price}
                </span>
              </div>
            </div>

            {/* Developer & Publisher */}
            <div className="text-xs text-slate-400 space-y-1">
              <div>
                <span className="text-slate-500">Developer:</span> <span className="text-slate-200">{game.developer}</span>
              </div>
              <div>
                <span className="text-slate-500">Publisher:</span> <span className="text-slate-200">{game.publisher}</span>
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {game.genres.map(g => (
                <span key={g} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {onOpenDetails && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenDetails(game);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors text-center cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  Full Game Specs & DNA
                </button>
              )}

              {onToggleBacklog && (
                <button
                  onClick={() => onToggleBacklog(game)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSavedInBacklog
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                  title={isSavedInBacklog ? 'In Backlog' : 'Add to Backlog'}
                >
                  {isSavedInBacklog ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                </button>
              )}
            </div>

            <a
              href={game.steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-[#18202e] hover:bg-[#222d40] text-cyan-300 border border-cyan-800/40 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View on Official Steam Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
