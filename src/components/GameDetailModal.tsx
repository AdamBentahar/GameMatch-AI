import React, { useState } from 'react';
import { GameItem, BacklogItem, GameScreenshot } from '../types';
import { 
  X, ExternalLink, BookmarkPlus, Check, Star, Clock, Calendar, 
  ThumbsUp, Sparkles, CheckCircle2, AlertCircle, Shield, Gamepad2, 
  BarChart2, Layers, Tag, Monitor, ZoomIn, Image as ImageIcon, BookOpen
} from 'lucide-react';
import { PosterModal } from './PosterModal';
import { ScreenshotLightboxModal } from './ScreenshotLightboxModal';

interface GameDetailModalProps {
  game: GameItem | null;
  onClose: () => void;
  backlogItem?: BacklogItem;
  onToggleBacklog: (game: GameItem, status: BacklogItem['status']) => void;
  onSelectSeedGame: (gameTitle: string) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  backlogItem,
  onToggleBacklog,
  onSelectSeedGame,
}) => {
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  if (!game) return null;

  const breakdown = game.debugBreakdown;

  const getDifficultyColor = (diff: GameItem['difficulty']) => {
    switch (diff) {
      case 'Casual':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Moderate':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Challenging':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Soulslike':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#111724] border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-indigo-950/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Banner Hero */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0">
          <img
            src={game.bannerUrl}
            alt={game.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111724] via-[#111724]/60 to-transparent" />
          
          {/* Match Score Badge */}
          {game.matchScore && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{game.matchScore}% Match Score</span>
            </div>
          )}

          {/* Title, Poster & Tagline in hero bottom */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 sm:gap-6">
            {/* Original Steam Vertical Poster (2:3 Box Art) */}
            <div 
              onClick={() => setShowPosterLightbox(true)}
              className="relative shrink-0 w-20 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/90 group cursor-pointer bg-slate-900 transition-transform hover:scale-105"
              title="Click to view full-resolution original Steam poster"
            >
              <img
                src={game.posterUrl}
                alt={`${game.title} original poster`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = game.capsuleUrl || game.bannerUrl;
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-2 py-1 rounded bg-black/80 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" /> Poster
                </span>
              </div>
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-slate-300">
                Box Art
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {game.genres.map(g => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-medium">
                    {g}
                  </span>
                ))}
                <span className={`text-xs px-2.5 py-0.5 rounded-md border font-mono font-semibold ${getDifficultyColor(game.difficulty)}`}>
                  {game.difficulty}
                </span>
                <button
                  onClick={() => setShowPosterLightbox(true)}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-mono inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Original Poster (600×900)</span>
                </button>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-wide truncate sm:whitespace-normal">
                {game.title}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm italic mt-1 max-w-2xl line-clamp-2">
                "{game.tagline}"
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Fast Spec Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Steam Reviews</p>
                <p className="font-semibold text-white">{game.reviewPercentage}% ({game.reviewCount})</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Campaign / Avg</p>
                <p className="font-semibold text-white">~{game.mainStoryPlaytime}h / ~{game.averagePlaytime}h</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Released</p>
                <p className="font-semibold text-white">{game.releaseYear}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Steam Price</p>
                <p className="font-semibold text-white">{game.price}</p>
              </div>
            </div>
          </div>

          {/* Hard Constraints & Verified Properties Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">CRAFTING</span>
              <span className={game.hasCrafting ? 'text-amber-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                {game.hasCrafting ? 'Required Systems' : 'No Crafting'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">SOLO VIABILITY</span>
              <span className={game.singlePlayer ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {game.singlePlayer ? 'Full Single-Player' : 'Co-op Mandatory'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">MULTIPLAYER</span>
              <span className="text-slate-200">
                {game.coopSupport ? 'Co-op' : ''} {game.pvpSupport ? 'PvP' : ''} {!game.coopSupport && !game.pvpSupport ? 'Pure Solo' : ''}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">JUMP SCARES</span>
              <span className={game.hasJumpScares ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {game.hasJumpScares ? 'Present' : 'None'}
              </span>
            </div>
          </div>

          {/* AI Personalized Verdict */}
          {game.aiVerdict && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30">
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Recommendation Verdict</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">
                {game.aiVerdict}
              </p>
            </div>
          )}

          {/* Match DNA Breakdown (if available) */}
          {breakdown && (
            <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-indigo-400 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Recommendation Engine Score Breakdown</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Confidence: {Math.round(breakdown.confidence * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Semantic Match</span>
                  <span className="text-cyan-300 font-bold">{Math.round(breakdown.semanticScore * 100)}%</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">11D Feature Sim</span>
                  <span className="text-indigo-300 font-bold">{Math.round(breakdown.featureScore * 100)}%</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Taste Alignment</span>
                  <span className="text-emerald-300 font-bold">{Math.round(breakdown.tasteScore * 100)}%</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Constraints</span>
                  <span className="text-amber-300 font-bold">{Math.round(breakdown.constraintSatisfaction * 100)}%</span>
                </div>
              </div>

              {breakdown.positiveMatches.length > 0 && (
                <div className="text-xs pt-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1">Key Match Drivers:</span>
                  <ul className="space-y-1 text-slate-300">
                    {breakdown.positiveMatches.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* The Story & Lore Synopsis */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>The Story & World Setting</span>
            </h4>
            <p className="text-slate-200 text-sm leading-relaxed">
              {game.storySynopsis || game.description}
            </p>
          </div>

          {/* Screenshots Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Steam Screenshots & Capture Gallery</span>
              </h4>
              <button
                onClick={() => setActiveScreenshotIndex(0)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                View Fullscreen HD Slideshow
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(game.screenshots && game.screenshots.length > 0
                ? game.screenshots.slice(0, 4)
                : [
                    { id: 1, thumbnail: game.bannerUrl, full: game.bannerUrl },
                    { id: 2, thumbnail: game.capsuleUrl, full: game.capsuleUrl },
                    { id: 3, thumbnail: game.posterUrl, full: game.posterUrl },
                  ]
              ).map((shot, idx) => (
                <div
                  key={shot.id ?? idx}
                  onClick={() => setActiveScreenshotIndex(idx)}
                  className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-500 cursor-pointer group shadow"
                >
                  <img
                    src={shot.thumbnail || shot.full}
                    alt={`${game.title} shot ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-1.5 rounded-full bg-indigo-600 text-white">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Mechanics & Themes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {game.mechanics && game.mechanics.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" /> Key Gameplay Mechanics
                </h5>
                <ul className="space-y-1 text-xs text-slate-300">
                  {game.mechanics.map((m, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-cyan-400 font-mono">▸</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {game.themes && game.themes.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Atmospheric Themes
                </h5>
                <ul className="space-y-1 text-xs text-slate-300">
                  {game.themes.map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-indigo-400 font-mono">▸</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Pros & Caveats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {game.pros && game.pros.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Why You'll Love It
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {game.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {game.cons && game.cons.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30">
                <h5 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Heads-Up / Caveats
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {game.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Supported Platforms */}
          {game.platforms && game.platforms.length > 0 && (
            <div>
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">Supported Platforms</h4>
              <div className="flex flex-wrap gap-1.5">
                {game.platforms.map(p => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-mono flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-cyan-400" />
                    <span>{p}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Similar Games */}
          {game.similarTo && game.similarTo.length > 0 && (
            <div>
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2">Similar Titles</h4>
              <div className="flex flex-wrap gap-2">
                {game.similarTo.map(sim => (
                  <button
                    key={sim}
                    onClick={() => {
                      onSelectSeedGame(sim);
                      onClose();
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/40 text-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{sim}</span>
                    <span className="text-[10px] text-indigo-400 font-mono">→ Seed Advisor</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#0d121c] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Backlog Status:</span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => onToggleBacklog(game, 'want-to-play')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  backlogItem?.status === 'want-to-play'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Want to Play
              </button>
              <button
                onClick={() => onToggleBacklog(game, 'playing')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  backlogItem?.status === 'playing'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Playing
              </button>
              <button
                onClick={() => onToggleBacklog(game, 'completed')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  backlogItem?.status === 'completed'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={game.steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#171d25] to-[#222c3c] hover:from-[#1e2633] hover:to-[#2c394e] text-white border border-slate-700 text-sm font-semibold shadow-md transition-all group"
            >
              <span>View on Steam</span>
              <ExternalLink className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* High-Resolution Original Steam Poster Lightbox */}
      {showPosterLightbox && (
        <PosterModal
          game={game}
          onClose={() => setShowPosterLightbox(false)}
          isSavedInBacklog={!!backlogItem}
          onToggleBacklog={(g) => onToggleBacklog(g, backlogItem ? backlogItem.status : 'want-to-play')}
        />
      )}

      {/* Full-Screen Screenshots Lightbox */}
      {activeScreenshotIndex !== null && (
        <ScreenshotLightboxModal
          game={game}
          screenshots={game.screenshots || []}
          initialIndex={activeScreenshotIndex}
          onClose={() => setActiveScreenshotIndex(null)}
        />
      )}
    </div>
  );
};
