import React, { useState, useMemo, useEffect } from 'react';
import { GameItem, GameScreenshot, BacklogItem } from '../types';
import { ScreenshotLightboxModal } from './ScreenshotLightboxModal';
import { 
  BookOpen, Search, Star, Image as ImageIcon, Sparkles, Filter, 
  ChevronRight, ExternalLink, BookmarkPlus, Check, SlidersHorizontal,
  Clock, ShieldCheck, Heart, Users, Laptop, Gamepad2, Layers,
  LayoutGrid, Columns, List, Award, AlertCircle, RotateCcw,
  Zap, Info, Compass, Play, ArrowUpDown, ChevronDown, ChevronUp
} from 'lucide-react';

interface SteamGamesCodexProps {
  catalog: GameItem[];
  backlog: BacklogItem[];
  onToggleBacklog: (game: GameItem, status?: BacklogItem['status']) => void;
  onOpenDetails: (game: GameItem) => void;
  onNavigateToSquads: (gameTitle?: string) => void;
  onNavigateToSteamStore: (seedQuery?: string) => void;
}

export const SteamGamesCodex: React.FC<SteamGamesCodexProps> = ({
  catalog,
  backlog,
  onToggleBacklog,
  onOpenDetails,
  onNavigateToSquads,
  onNavigateToSteamStore,
}) => {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedRatingTier, setSelectedRatingTier] = useState<'All' | 'Overwhelmingly Positive' | '90+' | '80+' | 'Metacritic 80+'>('All');
  const [selectedStoryDepth, setSelectedStoryDepth] = useState<'All' | 'Deep Story & Lore' | 'Moderate Story' | 'Gameplay-First'>('All');
  const [selectedPlaytime, setSelectedPlaytime] = useState<'All' | 'Under 15h' | '15h - 40h' | '40h+ Epic'>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<'All' | 'Steam Deck' | 'Co-op' | 'Single-player'>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'newest' | 'metacritic' | 'playtime' | 'title'>('rating');
  
  // View Layout: 'showcase' (rich story + screenshot strip cards), 'split' (2-column reader), 'posters' (compact grid)
  const [viewLayout, setViewLayout] = useState<'showcase' | 'split' | 'posters'>('showcase');
  
  // Selected Game for Split-Reader view
  const [selectedGameId, setSelectedGameId] = useState<string>(catalog[0]?.id || '');

  // Screenshot Lightbox Modal State
  const [lightboxData, setLightboxData] = useState<{
    game: GameItem;
    screenshots: GameScreenshot[];
    initialIndex: number;
  } | null>(null);

  // Cache for dynamic full-details (screenshots, lore, specs) fetched on-demand
  const [deepDiveCache, setDeepDiveCache] = useState<Record<number, {
    screenshots: GameScreenshot[];
    storySynopsis: string;
    metacriticScore?: number;
    pcRequirements?: { minimum?: string; recommended?: string };
  }>>({});

  // Loading state for live Steam search
  const [isSearchingSteam, setIsSearchingSteam] = useState(false);
  const [dynamicCatalog, setDynamicCatalog] = useState<GameItem[]>(catalog);

  // Sync with prop catalog changes
  useEffect(() => {
    setDynamicCatalog(prev => {
      const map = new Map<number, GameItem>();
      prev.forEach(g => map.set(g.steamAppId, g));
      catalog.forEach(g => map.set(g.steamAppId, g));
      return Array.from(map.values());
    });
  }, [catalog]);

  // If search yields no results locally and has >= 3 chars, query server for auto-import from Steam 100k+
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) return;

    const hasLocalMatch = dynamicCatalog.some(g =>
      g.title.toLowerCase().includes(trimmed.toLowerCase()) ||
      g.genres.some(genre => genre.toLowerCase().includes(trimmed.toLowerCase()))
    );

    if (!hasLocalMatch) {
      const timer = setTimeout(async () => {
        setIsSearchingSteam(true);
        try {
          const res = await fetch(`/api/games/catalog?q=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            const results: GameItem[] = await res.json();
            if (Array.isArray(results) && results.length > 0) {
              setDynamicCatalog(prev => {
                const map = new Map<number, GameItem>();
                prev.forEach(g => map.set(g.steamAppId, g));
                results.forEach(g => map.set(g.steamAppId, g));
                return Array.from(map.values());
              });
            }
          }
        } catch (e) {
          console.warn('Live search error:', e);
        } finally {
          setIsSearchingSteam(false);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, dynamicCatalog]);

  // Fetch deep-dive screenshots & story for a game if not already present
  const fetchDeepDive = async (game: GameItem) => {
    if (deepDiveCache[game.steamAppId]) return;
    if (game.screenshots && game.screenshots.length > 0 && game.storySynopsis) {
      setDeepDiveCache(prev => ({
        ...prev,
        [game.steamAppId]: {
          screenshots: game.screenshots!,
          storySynopsis: game.storySynopsis!,
          metacriticScore: game.metacriticScore,
          pcRequirements: game.pcRequirements,
        }
      }));
      return;
    }

    try {
      const res = await fetch(`/api/games/${game.steamAppId}/deep-dive`);
      if (res.ok) {
        const data = await res.json();
        setDeepDiveCache(prev => ({
          ...prev,
          [game.steamAppId]: {
            screenshots: data.screenshots || [],
            storySynopsis: data.storySynopsis || game.description,
            metacriticScore: data.metacritic?.score || game.metacriticScore,
            pcRequirements: data.pcRequirements,
          }
        }));
      }
    } catch (e) {
      console.warn(`Failed to fetch deep dive for ${game.steamAppId}`, e);
    }
  };

  // Helper to get effective screenshots for a game (cache -> item -> fallback)
  const getGameScreenshots = (game: GameItem): GameScreenshot[] => {
    if (deepDiveCache[game.steamAppId]?.screenshots?.length > 0) {
      return deepDiveCache[game.steamAppId].screenshots;
    }
    if (game.screenshots && game.screenshots.length > 0) {
      return game.screenshots;
    }
    // High quality fallbacks from Steam CDN
    return [
      { id: 1, thumbnail: game.bannerUrl, full: game.bannerUrl, caption: 'Official Header' },
      { id: 2, thumbnail: game.capsuleUrl, full: game.capsuleUrl, caption: 'Store Capsule' },
      { id: 3, thumbnail: game.posterUrl, full: game.posterUrl, caption: 'Vertical Poster' },
    ];
  };

  // Helper to get effective story synopsis
  const getGameStory = (game: GameItem): string => {
    if (deepDiveCache[game.steamAppId]?.storySynopsis) {
      return deepDiveCache[game.steamAppId].storySynopsis;
    }
    if (game.storySynopsis) return game.storySynopsis;
    return game.description || game.tagline;
  };

  // Available Genres extracted dynamically
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    dynamicCatalog.forEach(g => g.genres.forEach(genre => set.add(genre)));
    return ['All', ...Array.from(set).sort()];
  }, [dynamicCatalog]);

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return dynamicCatalog.filter(game => {
      // Search query filter
      if (q) {
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchGenre = game.genres.some(g => g.toLowerCase().includes(q));
        const matchTag = game.tags.some(t => t.toLowerCase().includes(q));
        const matchDev = game.developer.toLowerCase().includes(q);
        const matchStory = (game.description + ' ' + (game.storySynopsis || '')).toLowerCase().includes(q);
        if (!matchTitle && !matchGenre && !matchTag && !matchDev && !matchStory) {
          return false;
        }
      }

      // Genre filter
      if (selectedGenre !== 'All') {
        if (!game.genres.includes(selectedGenre) && !game.tags.includes(selectedGenre)) {
          return false;
        }
      }

      // Review Rating filter
      if (selectedRatingTier === 'Overwhelmingly Positive') {
        if (!game.reviewSentiment.toLowerCase().includes('overwhelmingly') && game.reviewPercentage < 95) {
          return false;
        }
      } else if (selectedRatingTier === '90+') {
        if (game.reviewPercentage < 90) return false;
      } else if (selectedRatingTier === '80+') {
        if (game.reviewPercentage < 80) return false;
      } else if (selectedRatingTier === 'Metacritic 80+') {
        const meta = deepDiveCache[game.steamAppId]?.metacriticScore || game.metacriticScore;
        if (!meta || meta < 80) return false;
      }

      // Story & Lore Depth filter
      if (selectedStoryDepth === 'Deep Story & Lore') {
        if (game.featureVector.narrativeStory < 0.65) return false;
      } else if (selectedStoryDepth === 'Moderate Story') {
        if (game.featureVector.narrativeStory < 0.35 || game.featureVector.narrativeStory >= 0.65) return false;
      } else if (selectedStoryDepth === 'Gameplay-First') {
        if (game.featureVector.narrativeStory >= 0.40) return false;
      }

      // Playtime filter
      if (selectedPlaytime === 'Under 15h') {
        if (game.mainStoryPlaytime > 15) return false;
      } else if (selectedPlaytime === '15h - 40h') {
        if (game.mainStoryPlaytime < 15 || game.mainStoryPlaytime > 40) return false;
      } else if (selectedPlaytime === '40h+ Epic') {
        if (game.mainStoryPlaytime < 40) return false;
      }

      // Platform / Specs filter
      if (selectedPlatform === 'Steam Deck') {
        if (!game.platforms.includes('Steam Deck')) return false;
      } else if (selectedPlatform === 'Co-op') {
        if (!game.coopSupport && !game.multiplayer) return false;
      } else if (selectedPlatform === 'Single-player') {
        if (!game.singlePlayer) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') {
        return b.reviewPercentage - a.reviewPercentage;
      } else if (sortBy === 'reviews') {
        const parseRev = (s: string) => parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
        return parseRev(b.reviewCount) - parseRev(a.reviewCount);
      } else if (sortBy === 'newest') {
        return (b.releaseYear || 2000) - (a.releaseYear || 2000);
      } else if (sortBy === 'metacritic') {
        const scoreA = deepDiveCache[a.steamAppId]?.metacriticScore || a.metacriticScore || 0;
        const scoreB = deepDiveCache[b.steamAppId]?.metacriticScore || b.metacriticScore || 0;
        return scoreB - scoreA;
      } else if (sortBy === 'playtime') {
        return b.mainStoryPlaytime - a.mainStoryPlaytime;
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [dynamicCatalog, searchQuery, selectedGenre, selectedRatingTier, selectedStoryDepth, selectedPlaytime, selectedPlatform, sortBy, deepDiveCache]);

  // Currently active game in Split-Reader view
  const activeReaderGame = useMemo(() => {
    return dynamicCatalog.find(g => g.id === selectedGameId) || filteredGames[0] || dynamicCatalog[0];
  }, [dynamicCatalog, selectedGameId, filteredGames]);

  // When active game changes in split view, preload its screenshots
  useEffect(() => {
    if (activeReaderGame) {
      fetchDeepDive(activeReaderGame);
    }
  }, [activeReaderGame]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0c121e] via-[#090d16] to-[#07090e] border-b border-slate-800/80 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-1/4 -mt-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 -mb-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>The Steam Master Codex & Visual Archive</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
                All Steam Games <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-indigo-300 to-cyan-300">Encyclopedia</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                Explore every game with its comprehensive story synopsis, verified Steam community review ratings, high-resolution screenshot galleries, hardware requirements, and developer records.
              </p>
            </div>

            {/* Quick Codex Stats */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Games</div>
                <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
                  <span>{dynamicCatalog.length}</span>
                  <span className="text-xs text-amber-400 font-sans">loaded</span>
                </div>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Steam Universe</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
                  <span>100,000+</span>
                  <span className="text-xs text-slate-400 font-sans">connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Universal Search Bar */}
          <div className="mt-8 relative max-w-4xl">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-indigo-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search all Steam games by title, genre, story premise, developer, or tags..."
                className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-700/80 focus:border-indigo-500 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm shadow-xl transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {isSearchingSteam && (
              <div className="absolute -bottom-6 left-2 flex items-center gap-2 text-xs text-cyan-400">
                <div className="w-3 h-3 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                <span>Searching live across Steam's 100,000+ game universe...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Controls Bar: Filters & Layout Switcher */}
        <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {/* Rating Filter */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 font-medium">Rating:</span>
                <select
                  value={selectedRatingTier}
                  onChange={e => setSelectedRatingTier(e.target.value as any)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Ratings</option>
                  <option value="Overwhelmingly Positive" className="bg-slate-900">Overwhelmingly Positive (95%+)</option>
                  <option value="90+" className="bg-slate-900">90%+ Very Positive</option>
                  <option value="80+" className="bg-slate-900">80%+ Positive</option>
                  <option value="Metacritic 80+" className="bg-slate-900">Metacritic 80+</option>
                </select>
              </div>

              {/* Genre Filter */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400 font-medium">Genre:</span>
                <select
                  value={selectedGenre}
                  onChange={e => setSelectedGenre(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  {availableGenres.map(g => (
                    <option key={g} value={g} className="bg-slate-900">{g}</option>
                  ))}
                </select>
              </div>

              {/* Story / Narrative Filter */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400 font-medium">Story:</span>
                <select
                  value={selectedStoryDepth}
                  onChange={e => setSelectedStoryDepth(e.target.value as any)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Stories</option>
                  <option value="Deep Story & Lore" className="bg-slate-900">Deep Story & Lore</option>
                  <option value="Moderate Story" className="bg-slate-900">Balanced Story</option>
                  <option value="Gameplay-First" className="bg-slate-900">Gameplay-First</option>
                </select>
              </div>

              {/* Playtime Filter */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 font-medium">Campaign:</span>
                <select
                  value={selectedPlaytime}
                  onChange={e => setSelectedPlaytime(e.target.value as any)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Lengths</option>
                  <option value="Under 15h" className="bg-slate-900">Under 15h</option>
                  <option value="15h - 40h" className="bg-slate-900">15h - 40h Medium</option>
                  <option value="40h+ Epic" className="bg-slate-900">40h+ Epic Saga</option>
                </select>
              </div>

              {/* Platform / Deck Filter */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Laptop className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-400 font-medium">Mode:</span>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value as any)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Modes</option>
                  <option value="Steam Deck" className="bg-slate-900">Steam Deck</option>
                  <option value="Single-player" className="bg-slate-900">Single-player</option>
                  <option value="Co-op" className="bg-slate-900">Co-op / Multiplayer</option>
                </select>
              </div>
            </div>

            {/* Right: Sort and Layout View Switcher */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="rating" className="bg-slate-900">Highest Steam Rating</option>
                  <option value="reviews" className="bg-slate-900">Most Reviews</option>
                  <option value="newest" className="bg-slate-900">Release Date (Newest)</option>
                  <option value="metacritic" className="bg-slate-900">Metacritic Score</option>
                  <option value="playtime" className="bg-slate-900">Campaign Playtime</option>
                  <option value="title" className="bg-slate-900">Title A - Z</option>
                </select>
              </div>

              {/* View Mode Buttons */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 p-0.5 rounded-xl">
                <button
                  onClick={() => setViewLayout('showcase')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'showcase' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Showcase Cards (Story, Rating & Screenshots)"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewLayout('split')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'split' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Cinematic Split Reader"
                >
                  <Columns className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewLayout('posters')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewLayout === 'posters' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Poster Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results count indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/40">
            <div>
              Showing <span className="text-white font-mono font-bold">{filteredGames.length}</span> games matching your filters
            </div>
            {(selectedGenre !== 'All' || selectedRatingTier !== 'All' || selectedStoryDepth !== 'All' || selectedPlaytime !== 'All' || selectedPlatform !== 'All' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedGenre('All');
                  setSelectedRatingTier('All');
                  setSelectedStoryDepth('All');
                  setSelectedPlaytime('All');
                  setSelectedPlatform('All');
                  setSearchQuery('');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* VIEW MODE 1: SHOWCASE CARDS (Full Story Synopsis, Ratings, Screenshot Strips) */}
        {viewLayout === 'showcase' && (
          <div className="space-y-6">
            {filteredGames.map(game => {
              const screenshots = getGameScreenshots(game);
              const story = getGameStory(game);
              const inBacklog = backlog.some(b => b.game.id === game.id);
              const metacritic = deepDiveCache[game.steamAppId]?.metacriticScore || game.metacriticScore;

              return (
                <article
                  key={game.id}
                  className="bg-[#0b0e17] border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group hover:shadow-indigo-500/5"
                >
                  <div className="p-5 sm:p-7 flex flex-col lg:flex-row gap-6">
                    {/* Left: Authentic 600x900 Vertical Poster */}
                    <div className="w-full sm:w-48 lg:w-56 shrink-0 flex flex-col items-center">
                      <div 
                        onClick={() => onOpenDetails(game)}
                        className="relative w-40 sm:w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-slate-800 cursor-pointer group/poster"
                      >
                        <img
                          src={game.posterUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-end justify-center p-3">
                          <span className="text-xs text-white bg-indigo-600/90 px-2.5 py-1 rounded-full font-medium">
                            Full Game Specs
                          </span>
                        </div>
                      </div>

                      {/* Price & Steam URL link */}
                      <div className="w-full mt-3 flex items-center justify-between text-xs px-1">
                        <span className="font-mono font-bold text-white text-sm">{game.price}</span>
                        <a
                          href={game.steamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                        >
                          <span>Steam</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Middle & Right: The Story, Ratings, Specs, & Screenshot Strip */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Title, Year, Developer, Rating Badge */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 
                                onClick={() => onOpenDetails(game)}
                                className="text-xl sm:text-2xl font-bold font-display text-white hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                {game.title}
                              </h2>
                              <span className="text-xs font-mono text-slate-400">({game.releaseYear})</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Developed by <span className="text-slate-200">{game.developer}</span> • Published by <span className="text-slate-300">{game.publisher}</span>
                            </p>
                          </div>

                          {/* Ratings Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            {metacritic && (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                                <Award className="w-3.5 h-3.5" />
                                <span>Metascore {metacritic}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-inner">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <div>
                                <div className="text-xs font-bold text-white flex items-baseline gap-1">
                                  <span>{game.reviewPercentage}%</span>
                                  <span className="text-[10px] text-emerald-400 font-medium">({game.reviewSentiment})</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{game.reviewCount} user reviews</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Genres & Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {game.genres.map(genre => (
                            <span key={genre} className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 font-medium">
                              {genre}
                            </span>
                          ))}
                          {game.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800 text-slate-400">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Dedicated: THE STORY & LORE SYNOPSIS */}
                        <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 relative">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>The Story & Narrative Arc</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                            {story}
                          </p>
                        </div>

                        {/* SCREENSHOTS GALLERY STRIP */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                            <span className="flex items-center gap-1.5 text-cyan-300">
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                              <span>High-Resolution Steam Screenshots ({screenshots.length} Captures)</span>
                            </span>
                            <button
                              onClick={() => {
                                fetchDeepDive(game);
                                setLightboxData({ game, screenshots, initialIndex: 0 });
                              }}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Open HD Slideshow</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {screenshots.slice(0, 4).map((shot, idx) => (
                              <div
                                key={shot.id ?? idx}
                                onClick={() => {
                                  fetchDeepDive(game);
                                  setLightboxData({ game, screenshots, initialIndex: idx });
                                }}
                                className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-500/80 cursor-pointer group/shot shadow-md"
                              >
                                <img
                                  src={shot.thumbnail || shot.full}
                                  alt={`${game.title} screenshot ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover/shot:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/shot:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="p-1.5 rounded-full bg-indigo-600/90 text-white shadow">
                                    <ImageIcon className="w-4 h-4" />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SPECIFICATIONS & HARDWARE BAR */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Story: <strong className="text-white">{game.mainStoryPlaytime}h</strong></span>
                            <span className="text-slate-500">|</span>
                            <span>Avg: <strong className="text-white">{game.averagePlaytime}h</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Difficulty: <strong className="text-white">{game.difficulty}</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {game.coopSupport ? 'Co-op Supported' : game.multiplayer ? 'Multiplayer' : 'Single-player Solo'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-sky-400" />
                            <span>Platforms: <strong className="text-white">{game.platforms.join(', ')}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleBacklog(game)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              inBacklog
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                          >
                            {inBacklog ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                            <span>{inBacklog ? 'In Backlog' : 'Add to Backlog'}</span>
                          </button>

                          {(game.coopSupport || game.multiplayer) && (
                            <button
                              onClick={() => onNavigateToSquads(game.title)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Find Squad</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              fetchDeepDive(game);
                              setLightboxData({ game, screenshots, initialIndex: 0 });
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Screenshots ({screenshots.length})</span>
                          </button>

                          <button
                            onClick={() => onOpenDetails(game)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
                          >
                            <span>Read Full Specs</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 2: CINEMATIC SPLIT READER (Left Column List + Right Column Full Story & Gallery) */}
        {viewLayout === 'split' && activeReaderGame && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Quick Picker (4 cols) */}
            <div className="lg:col-span-4 bg-[#0b0e17] border border-slate-800 rounded-2xl p-3 shadow-xl max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Games Codex List ({filteredGames.length})</span>
                <span className="text-indigo-400">Click to Inspect</span>
              </div>

              {filteredGames.map(game => {
                const isSelected = game.id === activeReaderGame.id;
                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      setSelectedGameId(game.id);
                      fetchDeepDive(game);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/60'
                    }`}
                  >
                    <img
                      src={game.posterUrl}
                      alt={game.title}
                      className="w-12 h-16 object-cover rounded shadow shrink-0 border border-slate-700/80"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
                        {game.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{game.genres.slice(0, 2).join(' • ')}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {game.reviewPercentage}%
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-mono">{game.price}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Full Cinematic Reader (8 cols) */}
            <div className="lg:col-span-8 bg-[#0b0e17] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header Art Backdrop */}
              <div className="relative aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                <img
                  src={activeReaderGame.bannerUrl}
                  alt={activeReaderGame.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600/80 text-white font-medium mb-1.5 inline-block">
                      AppID: {activeReaderGame.steamAppId}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-display font-bold text-white drop-shadow-lg">
                      {activeReaderGame.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                      {activeReaderGame.tagline}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => onToggleBacklog(activeReaderGame)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>{backlog.some(b => b.game.id === activeReaderGame.id) ? 'In Backlog' : 'Bookmark'}</span>
                    </button>
                    <a
                      href={activeReaderGame.steamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open on Steam"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Ratings and Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Steam Rating</div>
                  <div className="text-xl font-bold text-white flex items-baseline gap-1 mt-0.5">
                    <span className="text-amber-400">{activeReaderGame.reviewPercentage}%</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 truncate">{activeReaderGame.reviewSentiment}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Reviews Count</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {activeReaderGame.reviewCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Verified owners</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Campaign Length</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {activeReaderGame.mainStoryPlaytime}h
                  </div>
                  <div className="text-[10px] text-slate-400">Avg {activeReaderGame.averagePlaytime}h extras</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Price</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {activeReaderGame.price}
                  </div>
                  <div className="text-[10px] text-slate-400">{activeReaderGame.releaseYear} Release</div>
                </div>
              </div>

              {/* The Story & Narrative Lore Breakdown */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">The Story & Lore Arc</h3>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 leading-relaxed text-sm text-slate-200">
                  {getGameStory(activeReaderGame)}
                </div>
              </section>

              {/* High-Resolution Screenshot Gallery */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">
                      Screenshots & Visuals ({getGameScreenshots(activeReaderGame).length})
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const ss = getGameScreenshots(activeReaderGame);
                      setLightboxData({ game: activeReaderGame, screenshots: ss, initialIndex: 0 });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <span>Full-Screen Lightbox</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {getGameScreenshots(activeReaderGame).map((shot, idx) => (
                    <div
                      key={shot.id ?? idx}
                      onClick={() => {
                        const ss = getGameScreenshots(activeReaderGame);
                        setLightboxData({ game: activeReaderGame, screenshots: ss, initialIndex: idx });
                      }}
                      className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500 cursor-pointer group shadow-lg"
                    >
                      <img
                        src={shot.thumbnail || shot.full}
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white bg-indigo-600/90 px-2 py-1 rounded-md font-medium">
                          Inspect HD
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Hardware Requirements & Technical Info */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Laptop className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white">Technical & Hardware Specifications</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider block">Game Details</span>
                    <p className="text-slate-400">Developer: <strong className="text-white">{activeReaderGame.developer}</strong></p>
                    <p className="text-slate-400">Publisher: <strong className="text-white">{activeReaderGame.publisher}</strong></p>
                    <p className="text-slate-400">Release Date: <strong className="text-white">{activeReaderGame.releaseDate}</strong></p>
                    <p className="text-slate-400">Controller: <strong className="text-white">{activeReaderGame.controllerSupport || 'Fully Supported'}</strong></p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider block">Features & Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {activeReaderGame.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* VIEW MODE 3: HIGH-DENSITY POSTER GRID */}
        {viewLayout === 'posters' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredGames.map(game => {
              const inBacklog = backlog.some(b => b.game.id === game.id);
              const screenshots = getGameScreenshots(game);

              return (
                <div
                  key={game.id}
                  className="bg-[#0b0e17] border border-slate-800 hover:border-indigo-500/80 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col group cursor-pointer"
                  onClick={() => onOpenDetails(game)}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                    <img
                      src={game.posterUrl}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Review Badge Overlay */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-amber-400 flex items-center gap-1 shadow">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{game.reviewPercentage}%</span>
                    </div>

                    {/* Screenshot Count Overlay */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        fetchDeepDive(game);
                        setLightboxData({ game, screenshots, initialIndex: 0 });
                      }}
                      className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 hover:bg-indigo-600 text-[10px] text-white flex items-center gap-1 transition-colors"
                      title="Inspect Screenshots"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>{screenshots.length} shots</span>
                    </button>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {game.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {game.genres.slice(0, 2).join(' • ')}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-300">{game.price}</span>
                      <span className="text-slate-400">{game.mainStoryPlaytime}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Search State */}
        {filteredGames.length === 0 && (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/60 p-8 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Matching Games Found</h3>
            <p className="text-sm text-slate-400 mt-2">
              No games currently loaded match your search "{searchQuery}" with the active filters.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedGenre('All');
                  setSelectedRatingTier('All');
                  setSelectedStoryDepth('All');
                  setSelectedPlaytime('All');
                  setSelectedPlatform('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => onNavigateToSteamStore(searchQuery)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search 100,000+ Steam Store</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Full-Screen High-Res Screenshot Lightbox Modal */}
      {lightboxData && (
        <ScreenshotLightboxModal
          game={lightboxData.game}
          screenshots={lightboxData.screenshots}
          initialIndex={lightboxData.initialIndex}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};
