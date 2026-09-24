import React, { useState, useEffect } from 'react';
import { GameItem, BacklogItem, GamerDna } from '../types';
import { 
  BookmarkCheck, Star, Sparkles, ExternalLink, Trash2, 
  Dna, Flame, CheckCircle2, Clock, ThumbsUp, ArrowRight
} from 'lucide-react';

interface BacklogViewProps {
  backlog: BacklogItem[];
  onUpdateStatus: (gameId: string, status: BacklogItem['status']) => void;
  onUpdateRating: (gameId: string, rating: number) => void;
  onRemoveFromBacklog: (gameId: string) => void;
  onOpenDetails: (game: GameItem) => void;
  onSeedAdvisorWithBacklog: (gameTitles: string[]) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  backlog,
  onUpdateStatus,
  onUpdateRating,
  onRemoveFromBacklog,
  onOpenDetails,
  onSeedAdvisorWithBacklog,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [gamerDna, setGamerDna] = useState<GamerDna | null>(null);

  // Recalculate Gamer DNA when backlog changes
  useEffect(() => {
    fetchGamerDna();
  }, [backlog]);

  const fetchGamerDna = async () => {
    try {
      const rated = backlog.map(item => ({
        genres: item.game.genres,
        rating: item.rating || 4,
        title: item.game.title,
      }));

      const res = await fetch('/api/gamer-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratedGames: rated }),
      });
      const data = await res.json();
      setGamerDna(data);
    } catch (err) {
      console.error('Failed to compute gamer DNA', err);
    }
  };

  const filteredItems = backlog.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const getHighRatedTitles = () => {
    return backlog
      .filter(item => (item.rating && item.rating >= 4) || item.status === 'completed')
      .map(item => item.game.title);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Gamer DNA Hero Card */}
      {gamerDna && (
        <div className="rounded-3xl bg-gradient-to-r from-[#141b2c] via-[#101726] to-[#0c121e] border border-indigo-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[2px] shadow-lg shadow-indigo-600/30 shrink-0">
                <div className="w-full h-full bg-[#0b0e14] rounded-[14px] flex items-center justify-center text-3xl">
                  {gamerDna.badge}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Your Gamer DNA
                  </span>
                  <span className="text-xs font-mono text-cyan-400">
                    Archetype: {gamerDna.playStyleArchetype}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  {gamerDna.persona}
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                  {gamerDna.description}
                </p>

                {/* Top Genres Pill */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-mono text-slate-400">Core Genres:</span>
                  {gamerDna.topGenres.map(g => (
                    <span key={g} className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Action Button to Seed AI Advisor */}
            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
              <button
                onClick={() => onSeedAdvisorWithBacklog(getHighRatedTitles())}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Recommend with My DNA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-slate-400">
                Uses your top rated games as seeds
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Backlog List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-display font-bold text-white">
              My Saved Games & Library
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {backlog.length} Total
            </span>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'want-to-play', label: 'Want to Play' },
              { id: 'playing', label: 'Playing' },
              { id: 'completed', label: 'Completed' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === tab.id
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Backlog Items List */}
        {filteredItems.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0f1422] border border-slate-800 text-center space-y-3">
            <BookmarkCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-white">No games in this section yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Head to the AI Advisor to discover games and click the bookmark button to save them to your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.game.id}
                className="p-4 rounded-2xl bg-[#101625] border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row gap-4"
              >
                {/* Original Vertical Poster Thumbnail */}
                <div 
                  className="relative w-24 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden shrink-0 cursor-pointer group shadow-lg border border-slate-700/60 bg-slate-900"
                  onClick={() => onOpenDetails(item.game)}
                  title="Click to view details"
                >
                  <img
                    src={item.game.posterUrl || item.game.bannerUrl}
                    alt={item.game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = item.game.bannerUrl;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-cyan-300">
                    Poster
                  </div>
                </div>

                {/* Details & Controls */}
                <div className="flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 
                        onClick={() => onOpenDetails(item.game)}
                        className="text-base font-display font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                      >
                        {item.game.title}
                      </h4>

                      <button
                        onClick={() => onRemoveFromBacklog(item.game.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove from Backlog"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{item.game.tagline}"
                    </p>
                  </div>

                  {/* Status & Star Rating */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    {/* Status Selector */}
                    <select
                      value={item.status}
                      onChange={e => onUpdateStatus(item.game.id, e.target.value as any)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="want-to-play">Want to Play</option>
                      <option value="playing">Currently Playing</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => onUpdateRating(item.game.id, star)}
                          className="p-0.5 hover:scale-110 transition-transform"
                          title={`Rate ${star} Stars`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              item.rating && item.rating >= star
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600 hover:text-amber-400/50'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Steam Link */}
                    <a
                      href={item.game.steamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                      title="Open on Steam"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
