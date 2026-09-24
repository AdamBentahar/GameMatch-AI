import React, { useState, useEffect, useMemo } from 'react';
import { GameItem, BacklogItem, ParsedUserIntent } from '../types';
import { CURATED_GAMES, ALL_AUTOMATIC_GAMES } from '../data/gamesCatalog';
import { PosterModal } from './PosterModal';
import { FullCatalogBrowser } from './FullCatalogBrowser';
import { GamePosterImage } from './GamePosterImage';
import { 
  Sparkles, Search, SlidersHorizontal, Flame, Compass, Heart, 
  Tag, ExternalLink, BookmarkPlus, Check, ChevronDown, ChevronUp,
  RotateCcw, Info, Star, Gamepad2, ShieldAlert, CheckCircle2,
  Clock, ShieldCheck, Activity, BarChart2, LayoutGrid, List,
  Image as ImageIcon, ZoomIn, ArrowUpDown, Layers, ThumbsUp,
  Globe, DownloadCloud
} from 'lucide-react';

interface GameAdvisorProps {
  onOpenDetails: (game: GameItem) => void;
  backlog: BacklogItem[];
  onToggleBacklog: (game: GameItem, status?: BacklogItem['status']) => void;
  onSelectSeedGameFromBacklog?: (gameTitle: string) => void;
  externalSeed?: string | null;
  onClearExternalSeed?: () => void;
  catalog?: GameItem[];
  onNavigateToSteamStore?: () => void;
}

const SAMPLE_PROMPTS = [
  "games like Elden Ring under 20 hours without crafting",
  "something like Resident Evil 4 but less scary",
  "story-heavy RPG under 30 hours",
  "relaxing single-player game",
  "competitive multiplayer shooter",
  "something difficult but not a Soulslike",
  "game I can finish this weekend",
  "tactical 4-player co-op with chaotic survival",
];

const MOODS = [
  "Any",
  "Adrenaline & Action",
  "Chill & Relaxing",
  "Deep Story & Mystery",
  "Strategic Mind",
  "Co-op Chaos",
  "High Challenge"
];

const PLAYSTYLES = [
  "Any",
  "Solo Campaign",
  "Online Co-op",
  "Quick Sessions",
  "100+ Hr Sink"
];

const GENRES = [
  "Roguelike",
  "RPG",
  "Deckbuilder",
  "Action",
  "Adventure",
  "Strategy",
  "Automation",
  "Survival",
  "FPS",
  "Horror",
  "Metroidvania"
];

const LIBRARY_GENRE_FILTERS = [
  "All",
  "Action",
  "RPG",
  "Souls-like",
  "Roguelike",
  "Co-op",
  "Survival",
  "Story Rich",
  "Strategy",
  "Puzzle"
];

export const GameAdvisor: React.FC<GameAdvisorProps> = ({
  onOpenDetails,
  backlog,
  onToggleBacklog,
  externalSeed,
  onClearExternalSeed,
  catalog,
  onNavigateToSteamStore,
}) => {
  const effectiveCatalog = catalog && catalog.length > 0 ? catalog : ALL_AUTOMATIC_GAMES;

  // Navigation Mode: AI Recommendations vs Complete Library
  const [activeTab, setActiveTab] = useState<'recommendations' | 'all-games'>('recommendations');
  // Card layout: Original Posters vs Detailed Banners
  const [viewLayout, setViewLayout] = useState<'posters' | 'detailed'>('posters');
  // Poster Lightbox Modal State
  const [selectedPosterGame, setSelectedPosterGame] = useState<GameItem | null>(null);

  // AI Recommendation Engine state
  const [prompt, setPrompt] = useState('');
  const [selectedMood, setSelectedMood] = useState('Any');
  const [selectedPlayStyle, setSelectedPlayStyle] = useState('Any');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [likedGames, setLikedGames] = useState<string[]>([]);
  const [hatedGames, setHatedGames] = useState<string[]>([]);
  const [seedSearchInput, setSeedSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(70);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [recommendations, setRecommendations] = useState<GameItem[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<string | null>(null);
  const [detectedIntent, setDetectedIntent] = useState<ParsedUserIntent | null>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // If external seed requested (e.g. from modal or backlog)
  useEffect(() => {
    if (externalSeed) {
      if (!likedGames.includes(externalSeed)) {
        setLikedGames(prev => [...prev, externalSeed]);
      }
      setPrompt(prev => prev ? `${prev} + similar to ${externalSeed}` : `Games with the DNA of ${externalSeed}`);
      onClearExternalSeed?.();
    }
  }, [externalSeed]);

  // Loading animation sequence
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 2 ? prev + 1 : prev));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Initial load recommendation fetch
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async (overridePrompt?: string) => {
    const activePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activePrompt,
          mood: selectedMood,
          playStyle: selectedPlayStyle,
          genres: selectedGenres,
          likedGames,
          hatedGames,
          maxPrice,
          minReviewScore: 80,
          limit: 12,
        }),
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setRecommendationSource(data.source);
        setDetectedIntent(data.intent || null);
        setFilteredCount(data.filteredCount || 0);
      }
    } catch (err) {
      console.error('Failed to get recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSamplePrompt = (sampleText: string) => {
    setActiveTab('recommendations');
    setPrompt(sampleText);
    fetchRecommendations(sampleText);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const addLikedGame = () => {
    if (seedSearchInput.trim() && !likedGames.includes(seedSearchInput.trim())) {
      setLikedGames(prev => [...prev, seedSearchInput.trim()]);
      setSeedSearchInput('');
    }
  };

  const removeLikedGame = (gameTitle: string) => {
    setLikedGames(prev => prev.filter(g => g !== gameTitle));
  };

  const getBacklogStatus = (gameId: string) => {
    const item = backlog.find(b => b.game.id === gameId);
    return item?.status;
  };

  const toggleMatchDNA = (gameId: string) => {
    setExpandedMatchId(prev => (prev === gameId ? null : gameId));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#121929] via-[#0f1422] to-[#0a0d16] border border-slate-800/80 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Calibrated Recommendation Engine • {effectiveCatalog.length} Steam Games ({effectiveCatalog.length > 53 ? `53 Curated + ${effectiveCatalog.length - 53} Imported` : '53 Curated'}) with Original Posters</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Stop scrolling. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">Play what you'll love.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Strict hard constraint enforcement (playtime caps, no crafting, no jump scares) paired with 11-dimensional vector cosine similarity and original Steam library box art.
          </p>
        </div>

        {/* Search & Prompt Bar */}
        <div className="relative z-10 mt-8 space-y-3">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setActiveTab('recommendations');
                  fetchRecommendations();
                }
              }}
              placeholder="e.g. games like Elden Ring under 20 hours without crafting..."
              className="w-full pl-12 pr-32 sm:pr-40 py-4 bg-[#0d121c] border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm sm:text-base transition-all shadow-inner"
            />
            <button
              onClick={() => {
                setActiveTab('recommendations');
                fetchRecommendations();
              }}
              disabled={loading}
              className="absolute right-2 sm:right-3 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>{loading ? 'Matching...' : 'Match Games'}</span>
            </button>
          </div>

          {/* Prompt Inspiration Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-400 scrollbar-none">
            <span className="shrink-0 text-slate-500 font-mono text-[11px]">Benchmark queries:</span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSamplePrompt(sample)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 hover:text-cyan-300 border border-slate-700/50 text-[11px] transition-colors cursor-pointer"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* Filter Accordion Toggle */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showFilters ? 'Hide Fine-Tune Dials' : 'Fine-Tune Vibe & Preferences'}</span>
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {(selectedMood !== 'Any' || selectedPlayStyle !== 'Any' || selectedGenres.length > 0 || likedGames.length > 0) && (
            <button
              onClick={() => {
                setSelectedMood('Any');
                setSelectedPlayStyle('Any');
                setSelectedGenres([]);
                setLikedGames([]);
                setHatedGames([]);
                setMaxPrice(70);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dials</span>
            </button>
          )}
        </div>

        {/* Filter Panel Content */}
        {showFilters && (
          <div className="relative z-10 mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top duration-200">
            {/* Mood / Vibe Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Target Energy & Mood
              </label>
              <select
                value={selectedMood}
                onChange={e => setSelectedMood(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {MOODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Playstyle Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Playstyle Commitment
              </label>
              <select
                value={selectedPlayStyle}
                onChange={e => setSelectedPlayStyle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {PLAYSTYLES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Max Budget Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono uppercase text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  Max Steam Price
                </span>
                <span className="text-slate-200">${maxPrice}</span>
              </div>
              <input
                type="range"
                min="0"
                max="70"
                step="5"
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Free</span>
                <span>$30</span>
                <span>$70</span>
              </div>
            </div>

            {/* Seed Liked Games (DNA Matching) */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Anchor Games (Extract their Gameplay DNA)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={seedSearchInput}
                  onChange={e => setSeedSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLikedGame()}
                  placeholder="e.g. Hades, Hollow Knight, Cyberpunk 2077..."
                  className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={addLikedGame}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  Add Anchor
                </button>
              </div>

              {likedGames.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {likedGames.map(game => (
                    <span
                      key={game}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
                    >
                      <span>{game}</span>
                      <button
                        onClick={() => removeLikedGame(game)}
                        className="hover:text-rose-100 cursor-pointer font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Genres */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                Genre Affinities
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main View Mode & Catalog Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-2 rounded-2xl bg-[#0f1422] border border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>AI Matches ({recommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all-games')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'all-games'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>All {effectiveCatalog.length} Games & Posters</span>
          </button>
        </div>

        {/* View Layout Toggle & Steam Store Importer Link */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {onNavigateToSteamStore && (
            <button
              onClick={onNavigateToSteamStore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 via-indigo-500/20 to-cyan-500/20 hover:from-indigo-600/40 hover:to-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/10"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Steam Store (100k+)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </button>
          )}

          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewLayout('posters')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === 'posters'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Official 2:3 Vertical Steam Posters"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Original Posters</span>
            </button>
            <button
              onClick={() => setViewLayout('detailed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewLayout === 'detailed'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Detailed Banner & Match Breakdown"
            >
              <List className="w-3.5 h-3.5" />
              <span>Detailed Banners</span>
            </button>
          </div>
        </div>
      </div>

      {/* When Browsing Complete Verified Catalog */}
      {activeTab === "all-games" && (
        <FullCatalogBrowser
          catalog={effectiveCatalog}
          backlog={backlog}
          onOpenDetails={onOpenDetails}
          onOpenPosterModal={(g) => setSelectedPosterGame(g)}
          onToggleBacklog={(g, status) => onToggleBacklog(g, status || "want-to-play")}
          onNavigateToSteamStore={onNavigateToSteamStore}
        />
      )}

      {/* Loading Progress State */}
      {loading && (
        <div className="p-8 rounded-2xl bg-[#0f1422] border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-200">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-display font-bold text-white">
              {loadingStep === 0 && 'Deconstructing constraints & gameplay loops...'}
              {loadingStep === 1 && 'Calculating 11D vector cosine similarity...'}
              {loadingStep === 2 && 'Calibrating match confidence & verdicts...'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Filtering hard constraints against real Steam community data
            </p>
          </div>
        </div>
      )}

      {/* Recommendations Display */}
      {activeTab === 'recommendations' && !loading && recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                Personalized Matches
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {recommendations.length} Ranked Recommendations
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                (Ranked from complete {effectiveCatalog.length}-game verified catalog)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all-games')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Browse All {effectiveCatalog.length} Games & Posters →</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Strict Constraints Validated</span>
              </div>
            </div>
          </div>

          {/* Render Recommendations in Selected Layout */}
          {viewLayout === 'posters' ? (
            /* Recommendations in Original Poster Cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
              {recommendations.map(game => {
                const status = getBacklogStatus(game.id);
                return (
                  <div
                    key={game.id}
                    className="group relative flex flex-col rounded-2xl bg-[#101626] border border-slate-800/80 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-950/50 transition-all duration-300 overflow-hidden"
                  >
                    {/* Poster Box Art */}
                    <div 
                      className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 cursor-pointer"
                      onClick={() => onOpenDetails(game)}
                    >
                      <GamePosterImage
                        game={game}
                        alt={`${game.title} original poster`}
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101626] via-transparent to-black/30 pointer-events-none" />

                      {/* Match Score Badge */}
                      {game.matchScore && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3" />
                          <span>{game.matchScore}% Match</span>
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white font-mono text-[11px] font-semibold border border-white/10">
                        {game.price}
                      </div>

                      {/* Hover Overlay with Quick Poster Zoom */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPosterGame(game);
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/90 text-cyan-300 hover:text-white hover:bg-indigo-600 border border-slate-700 transition-colors shadow-lg cursor-pointer"
                          title="Inspect High-Res Original Poster"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(game);
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                        >
                          Specs & DNA
                        </button>
                      </div>

                      {/* Playtime & Difficulty Footer Tag */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-300">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                          <Clock className="w-2.5 h-2.5 text-cyan-400" />
                          ~{game.mainStoryPlaytime}h
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                          {game.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Card Meta Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        {/* Steam Rating */}
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="font-bold text-cyan-400">{game.reviewPercentage}%</span>
                          <span className="text-slate-400 text-[11px]">({game.reviewSentiment})</span>
                        </div>

                        {/* Title */}
                        <h4
                          onClick={() => onOpenDetails(game)}
                          className="text-base font-display font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                        >
                          {game.title}
                        </h4>

                        {/* AI Verdict Snippet */}
                        <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                          "{game.aiVerdict || game.tagline}"
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setSelectedPosterGame(game)}
                          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Poster</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onToggleBacklog(game, status ? undefined : 'want-to-play')}
                            className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                              status
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title={status ? `Saved as: ${status}` : 'Add to Want to Play'}
                          >
                            {status ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                          </button>

                          <a
                            href={game.steamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#18202e] hover:bg-[#202c40] text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
                            title="Open on Steam"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Recommendations in Detailed Banner Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(game => {
                const status = getBacklogStatus(game.id);
                const isMatchExpanded = expandedMatchId === game.id;
                const breakdown = game.debugBreakdown;

                return (
                  <div
                    key={game.id}
                    className="group relative flex flex-col rounded-2xl bg-[#101624] border border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/40 transition-all overflow-hidden"
                  >
                    {/* Card Banner */}
                    <div 
                      className="relative h-48 w-full overflow-hidden cursor-pointer"
                      onClick={() => onOpenDetails(game)}
                    >
                      <img
                        src={game.bannerUrl}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.posterUrl;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101624] via-transparent to-black/30" />

                      {/* Match Score Badge */}
                      {game.matchScore && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3" />
                          <span>{game.matchScore}% Match</span>
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white font-mono text-xs border border-white/10">
                        {game.price}
                      </div>

                      {/* Playtime & Difficulty Badges */}
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          ~{game.mainStoryPlaytime}h story
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                          {game.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Card Content with Vertical Poster & DNA Breakdown */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          {/* Original Poster Thumbnail */}
                          <div
                            onClick={() => setSelectedPosterGame(game)}
                            className="shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden border border-slate-700/80 shadow cursor-pointer group/poster"
                            title="Click to zoom original poster"
                          >
                            <GamePosterImage
                              game={game}
                              alt={`${game.title} poster`}
                              className="group-hover/poster:scale-110 transition-transform"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Genres & Crafting Flag */}
                            <div className="flex flex-wrap gap-1.5">
                              {game.genres.slice(0, 2).map(g => (
                                <span key={g} className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {g}
                                </span>
                              ))}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                game.hasCrafting 
                                  ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {game.hasCrafting ? 'Crafting' : 'No Crafting'}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 
                              onClick={() => onOpenDetails(game)}
                              className="text-lg font-display font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                            >
                              {game.title}
                            </h3>

                            {/* Steam Review Sentiment */}
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-semibold text-cyan-400">{game.reviewPercentage}%</span>
                              <span className="text-slate-400">({game.reviewSentiment})</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Verdict Snippet */}
                        <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          "{game.aiVerdict || game.tagline}"
                        </p>

                        {/* Toggle Match DNA Button */}
                        <button
                          onClick={() => toggleMatchDNA(game.id)}
                          className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{isMatchExpanded ? 'Hide Match DNA' : 'Inspect Match DNA & Reasoning'}</span>
                        </button>

                        {/* Expandable Match DNA Breakdown */}
                        {isMatchExpanded && breakdown && (
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-[11px] space-y-2 animate-in fade-in duration-150">
                            <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
                              <div>
                                <span className="text-slate-500">Vector Sim: </span>
                                <span className="text-indigo-300">{Math.round(breakdown.featureScore * 100)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Semantic: </span>
                                <span className="text-cyan-300">{Math.round(breakdown.semanticScore * 100)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Constraints: </span>
                                <span className="text-emerald-300">{Math.round(breakdown.constraintSatisfaction * 100)}%</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Confidence: </span>
                                <span className="text-amber-300">{Math.round(breakdown.confidence * 100)}%</span>
                              </div>
                            </div>

                            {breakdown.positiveMatches.length > 0 && (
                              <div className="pt-1 text-[11px]">
                                <span className="text-slate-400 font-mono block text-[10px] uppercase">Why it matched:</span>
                                <ul className="text-slate-300 space-y-0.5">
                                  {breakdown.positiveMatches.map((pm, idx) => (
                                    <li key={idx} className="flex items-start gap-1">
                                      <span className="text-emerald-400">✓</span>
                                      <span>{pm}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedPosterGame(game)}
                          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Inspect Poster</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleBacklog(game, status ? undefined : 'want-to-play')}
                            className={`p-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              status
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            {status ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                          </button>

                          <a
                            href={game.steamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#18202e] hover:bg-[#202c40] text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
                            title="Open on Steam"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Poster Inspection Lightbox */}
      {selectedPosterGame && (
        <PosterModal
          game={selectedPosterGame}
          onClose={() => setSelectedPosterGame(null)}
          onOpenDetails={onOpenDetails}
          isSavedInBacklog={!!getBacklogStatus(selectedPosterGame.id)}
          onToggleBacklog={(g) => onToggleBacklog(g, getBacklogStatus(g.id) || 'want-to-play')}
        />
      )}
    </div>
  );
};
