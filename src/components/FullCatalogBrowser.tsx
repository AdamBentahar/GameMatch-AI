import React, { useState, useMemo, useEffect } from 'react';
import { GameItem, BacklogItem } from '../types';
import { GamePosterImage } from './GamePosterImage';
import { 
  Search, ArrowUpDown, Filter, Layers, LayoutGrid, List, 
  ZoomIn, Clock, ThumbsUp, Calendar, ExternalLink, BookmarkPlus, 
  Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ShieldCheck, AlertCircle, X, Sparkles, RefreshCw, Terminal, 
  Monitor, Cpu, CheckCircle2
} from 'lucide-react';
import { CatalogPipelineReport, buildCanonicalCatalog } from '../services/catalogPipeline';

interface FullCatalogBrowserProps {
  catalog: GameItem[];
  backlog: BacklogItem[];
  onOpenDetails: (game: GameItem) => void;
  onOpenPosterModal?: (game: GameItem) => void;
  onToggleBacklog: (game: GameItem, status?: BacklogItem['status']) => void;
  onNavigateToSteamStore?: () => void;
}

const GENRE_OPTIONS = [
  'All',
  'Action',
  'RPG',
  'Souls-like',
  'Roguelike',
  'Co-op',
  'Survival',
  'Story Rich',
  'Strategy',
  'Puzzle',
  'FPS',
  'Deckbuilder',
  'Metroidvania',
  'Horror',
  'Automation',
  'Sci-Fi',
];

const PLATFORM_OPTIONS = ['All', 'Windows', 'Mac', 'Linux', 'Steam Deck Verified'];
const PLAYTIME_OPTIONS = ['All', 'Quick (<10h)', 'Medium (10–30h)', 'Deep (30–60h)', 'Massive (60h+)'];
const DIFFICULTY_OPTIONS = ['All', 'Casual', 'Moderate', 'Challenging', 'Soulslike'];
const MODE_OPTIONS = ['All', 'Single-Player Only', 'Co-op', 'Multiplayer'];
const PRICE_OPTIONS = ['All', 'Under $20', 'Under $40', 'Under $60'];
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96, -1]; // -1 represents 'All'

export const FullCatalogBrowser: React.FC<FullCatalogBrowserProps> = ({
  catalog,
  backlog,
  onOpenDetails,
  onOpenPosterModal,
  onToggleBacklog,
  onNavigateToSteamStore,
}) => {
  // View layout: 'posters' (official 2:3 vertical box art) vs 'detailed' (banner + mechanics)
  const [viewLayout, setViewLayout] = useState<'posters' | 'detailed'>('posters');

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedPlaytime, setSelectedPlaytime] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<
    'rating' | 'popular' | 'release-desc' | 'release-asc' | 'playtime-asc' | 'playtime-desc' | 'name-asc' | 'price-asc' | 'price-desc'
  >('rating');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Debug Panel HUD state (Requirement 16)
  const [showDebugHUD, setShowDebugHUD] = useState(false);
  const [serverDebugReport, setServerDebugReport] = useState<CatalogPipelineReport | null>(null);

  // Ensure we always have a clean, deduplicated, canonical baseline catalog
  const { catalog: canonicalCatalog, report: localReport } = useMemo(() => {
    return buildCanonicalCatalog(catalog);
  }, [catalog]);

  // Fetch server-side debug stats on mount
  useEffect(() => {
    fetch('/api/games/catalog/debug')
      .then(res => res.json())
      .then(data => {
        if (data.report) setServerDebugReport(data.report);
      })
      .catch(err => console.warn('Debug HUD fetch non-critical warning:', err));
  }, [catalog.length]);

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, selectedPlatform, selectedPlaytime, selectedDifficulty, selectedMode, selectedPrice, sortBy, pageSize]);

  // Comprehensive Catalog Filtering Pipeline
  const filteredCatalog = useMemo(() => {
    return canonicalCatalog.filter(game => {
      // 1. Text Search across Title, Developer, Publisher, Genres, and Tags
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesDev = game.developer.toLowerCase().includes(q) || game.publisher.toLowerCase().includes(q);
        const matchesGenres = game.genres.some(g => g.toLowerCase().includes(q));
        const matchesTags = game.tags.some(t => t.toLowerCase().includes(q));
        const matchesAppId = String(game.steamAppId).includes(q);
        if (!matchesTitle && !matchesDev && !matchesGenres && !matchesTags && !matchesAppId) {
          return false;
        }
      }

      // 2. Genre Filter
      if (selectedGenre !== 'All') {
        const target = selectedGenre.toLowerCase();
        if (target === 'souls-like') {
          const isSouls = game.difficulty === 'Soulslike' || 
            game.tags.some(t => t.toLowerCase().includes('souls') || t.toLowerCase().includes('soulslike')) ||
            game.genres.some(g => g.toLowerCase().includes('souls'));
          if (!isSouls) return false;
        } else {
          const hasGenre = game.genres.some(g => g.toLowerCase().includes(target)) ||
            game.tags.some(t => t.toLowerCase().includes(target));
          if (!hasGenre) return false;
        }
      }

      // 3. Platform Filter
      if (selectedPlatform !== 'All') {
        if (selectedPlatform === 'Steam Deck Verified' && !game.platforms.includes('Steam Deck')) return false;
        if (selectedPlatform === 'Windows' && !game.platforms.includes('Windows')) return false;
        if (selectedPlatform === 'Mac' && !game.platforms.includes('Mac')) return false;
        if (selectedPlatform === 'Linux' && !game.platforms.includes('Linux')) return false;
      }

      // 4. Playtime Filter
      if (selectedPlaytime !== 'All') {
        const h = game.mainStoryPlaytime;
        if (selectedPlaytime === 'Quick (<10h)' && h >= 10) return false;
        if (selectedPlaytime === 'Medium (10–30h)' && (h < 10 || h > 30)) return false;
        if (selectedPlaytime === 'Deep (30–60h)' && (h < 30 || h > 60)) return false;
        if (selectedPlaytime === 'Massive (60h+)' && h < 60) return false;
      }

      // 5. Difficulty Filter
      if (selectedDifficulty !== 'All') {
        if (game.difficulty !== selectedDifficulty) return false;
      }

      // 6. Mode Filter
      if (selectedMode !== 'All') {
        if (selectedMode === 'Single-Player Only' && (!game.singlePlayer || game.multiplayer)) return false;
        if (selectedMode === 'Co-op' && !game.coopSupport) return false;
        if (selectedMode === 'Multiplayer' && !game.multiplayer) return false;
      }

      // 7. Price Filter
      if (selectedPrice !== 'All') {
        const numericPrice = parseFloat(game.price.replace(/[^0-9.]/g, '') || '0');
        if (selectedPrice === 'Under $20' && numericPrice > 20) return false;
        if (selectedPrice === 'Under $40' && numericPrice > 40) return false;
        if (selectedPrice === 'Under $60' && numericPrice > 60) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.reviewPercentage - a.reviewPercentage;
      if (sortBy === 'popular') {
        const numB = parseInt(b.reviewCount.replace(/[^0-9]/g, '') || '0', 10);
        const numA = parseInt(a.reviewCount.replace(/[^0-9]/g, '') || '0', 10);
        return numB - numA;
      }
      if (sortBy === 'release-desc') return b.releaseYear - a.releaseYear;
      if (sortBy === 'release-asc') return a.releaseYear - b.releaseYear;
      if (sortBy === 'playtime-asc') return a.mainStoryPlaytime - b.mainStoryPlaytime;
      if (sortBy === 'playtime-desc') return b.mainStoryPlaytime - a.mainStoryPlaytime;
      if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'price-asc') {
        const pA = parseFloat(a.price.replace(/[^0-9.]/g, '') || '0');
        const pB = parseFloat(b.price.replace(/[^0-9.]/g, '') || '0');
        return pA - pB;
      }
      if (sortBy === 'price-desc') {
        const pA = parseFloat(a.price.replace(/[^0-9.]/g, '') || '0');
        const pB = parseFloat(b.price.replace(/[^0-9.]/g, '') || '0');
        return pB - pA;
      }
      return 0;
    });
  }, [canonicalCatalog, searchQuery, selectedGenre, selectedPlatform, selectedPlaytime, selectedDifficulty, selectedMode, selectedPrice, sortBy]);

  // Total pages and pagination calculation
  const totalFilteredGames = filteredCatalog.length;
  const isAllPages = pageSize === -1;
  const effectivePageSize = isAllPages ? Math.max(1, totalFilteredGames) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFilteredGames / effectivePageSize));

  // Current page boundary safety
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated slice
  const paginatedGames = useMemo(() => {
    if (isAllPages) return filteredCatalog;
    const startIndex = (safeCurrentPage - 1) * effectivePageSize;
    return filteredCatalog.slice(startIndex, startIndex + effectivePageSize);
  }, [filteredCatalog, safeCurrentPage, effectivePageSize, isAllPages]);

  const startIndexDisplay = totalFilteredGames === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endIndexDisplay = isAllPages ? totalFilteredGames : Math.min(safeCurrentPage * effectivePageSize, totalFilteredGames);

  const getBacklogStatus = (gameId: string) => {
    const item = backlog.find(b => b.game.id === gameId);
    return item?.status;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedPlatform('All');
    setSelectedPlaytime('All');
    setSelectedDifficulty('All');
    setSelectedMode('All');
    setSelectedPrice('All');
    setSortBy('rating');
    setCurrentPage(1);
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput('');
    }
  };

  const activeFiltersCount = [
    selectedGenre !== 'All',
    selectedPlatform !== 'All',
    selectedPlaytime !== 'All',
    selectedDifficulty !== 'All',
    selectedMode !== 'All',
    selectedPrice !== 'All',
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Top Action Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1422] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Universal Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search across all ${canonicalCatalog.length} games by title, developer, tag, or Steam AppID...`}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Controls: Layout, Filters Toggle, Debug HUD */}
          <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            {/* Advanced Filters Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="rating" className="bg-slate-900">Highest Steam Rating %</option>
                <option value="popular" className="bg-slate-900">Most Steam Reviews</option>
                <option value="release-desc" className="bg-slate-900">Release Year (Newest)</option>
                <option value="release-asc" className="bg-slate-900">Release Year (Classic)</option>
                <option value="playtime-asc" className="bg-slate-900">Campaign (Shortest)</option>
                <option value="playtime-desc" className="bg-slate-900">Campaign (Longest)</option>
                <option value="price-asc" className="bg-slate-900">Price (Lowest)</option>
                <option value="price-desc" className="bg-slate-900">Price (Highest)</option>
                <option value="name-asc" className="bg-slate-900">Title (A – Z)</option>
              </select>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewLayout('posters')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewLayout === 'posters'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Official 2:3 Vertical Steam Posters"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Posters</span>
              </button>
              <button
                onClick={() => setViewLayout('detailed')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewLayout === 'detailed'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed Cards with Story & Breakdown"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detailed</span>
              </button>
            </div>

            {/* Catalog Debug Pipeline HUD Toggle (Requirement 16) */}
            <button
              onClick={() => setShowDebugHUD(!showDebugHUD)}
              className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                showDebugHUD
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300'
              }`}
              title="Toggle Catalog Pipeline Audit HUD"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Genre Filter Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {GENRE_OPTIONS.map(genre => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {genre}
                {genre === 'All' && (
                  <span className="ml-1 text-[10px] opacity-75 font-mono">
                    ({canonicalCatalog.length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Platform</label>
              <select
                value={selectedPlatform}
                onChange={e => setSelectedPlatform(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
              >
                {PLATFORM_OPTIONS.map(p => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Campaign Playtime</label>
              <select
                value={selectedPlaytime}
                onChange={e => setSelectedPlaytime(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
              >
                {PLAYTIME_OPTIONS.map(p => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
              >
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d} value={d} className="bg-slate-900">{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Multiplayer / Mode</label>
              <select
                value={selectedMode}
                onChange={e => setSelectedMode(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
              >
                {MODE_OPTIONS.map(m => (
                  <option key={m} value={m} className="bg-slate-900">{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Price</label>
              <select
                value={selectedPrice}
                onChange={e => setSelectedPrice(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none"
              >
                {PRICE_OPTIONS.map(pr => (
                  <option key={pr} value={pr} className="bg-slate-900">{pr}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Catalog Debug HUD (Requirement 16) */}
      {showDebugHUD && (
        <div className="p-4 rounded-2xl bg-[#090e18] border border-cyan-500/40 text-xs font-mono space-y-3 animate-in fade-in duration-200 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Catalog Pipeline Audit Check (Requirement 16)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
              Pipeline Healthy
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Total Retrieved:</span>
              <strong className="text-white text-sm">{localReport.totalSourceRecords}</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">After Normalization:</span>
              <strong className="text-white text-sm">{localReport.afterNormalization}</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">After Deduplication:</span>
              <strong className="text-cyan-300 text-sm">{localReport.afterDeduplication}</strong>
              <span className="text-[9px] text-slate-500 block">({localReport.duplicatesRemoved} merged)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">After Validation:</span>
              <strong className="text-emerald-400 text-sm">{localReport.afterValidation}</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Matching Filters:</span>
              <strong className="text-amber-300 text-sm">{totalFilteredGames}</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Currently Visible:</span>
              <strong className="text-indigo-300 text-sm">{paginatedGames.length}</strong>
              <span className="text-[9px] text-slate-500 block">Page {safeCurrentPage}/{totalPages}</span>
            </div>
          </div>

          {localReport.duplicateDetails.length > 0 && (
            <div className="pt-2 text-[11px] text-slate-400">
              <span className="text-slate-500 uppercase text-[9px] block mb-1">Resolved Duplicate Canonical Entities:</span>
              <ul className="space-y-0.5">
                {localReport.duplicateDetails.map((dup, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-cyan-400">✓</span>
                    <span>{dup.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Catalog Status Bar & Pagination Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Showing <strong className="text-white font-bold">{startIndexDisplay}–{endIndexDisplay}</strong> of{' '}
            <strong className="text-cyan-300 font-bold">{totalFilteredGames}</strong> games
            {totalFilteredGames !== canonicalCatalog.length && (
              <span className="text-slate-500"> (filtered from {canonicalCatalog.length} total)</span>
            )}
          </span>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1 ml-2"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-slate-500">Per page:</span>
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {PAGE_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  pageSize === size
                    ? 'bg-indigo-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {size === -1 ? 'All' : size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Games Display: 2:3 Vertical Posters Grid or Detailed Banners Grid */}
      {paginatedGames.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0e131f] border border-slate-800 text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-white">No games match your current filters</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Try clearing your search query or broadening your genre/playtime filters to view all {canonicalCatalog.length} available catalog games.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg"
          >
            Clear All Filters ({canonicalCatalog.length} Games)
          </button>
        </div>
      ) : viewLayout === 'posters' ? (
        /* Responsive 2:3 Vertical Poster Grid (Requirement 13) */
        /* Mobile: 2 cols, Tablet: 3-4 cols, Desktop: 4-6 cols */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {paginatedGames.map(game => {
            const status = getBacklogStatus(game.id);
            return (
              <div
                key={game.id}
                className="group relative flex flex-col rounded-2xl bg-[#101626] border border-slate-800/80 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-950/50 transition-all duration-300 overflow-hidden"
              >
                {/* 2:3 Poster Art Container */}
                <div
                  className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 cursor-pointer"
                  onClick={() => onOpenDetails(game)}
                >
                  <GamePosterImage
                    game={game}
                    alt={`${game.title} official cover poster`}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101626] via-transparent to-black/25 pointer-events-none" />

                  {/* Steam AppID Tag */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono text-cyan-300 border border-cyan-500/20">
                    #{game.steamAppId}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white font-mono text-[10px] font-semibold border border-white/10">
                    {game.price}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                    {onOpenPosterModal && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenPosterModal(game);
                        }}
                        className="p-2 rounded-xl bg-slate-900/90 text-cyan-300 hover:text-white hover:bg-indigo-600 border border-slate-700 transition-colors shadow-lg cursor-pointer"
                        title="Inspect 600x900 Steam Cover Art"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenDetails(game);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                    >
                      Specs & DNA
                    </button>
                  </div>

                  {/* Footer Playtime & Mode Badge */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-300 pointer-events-none">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                      ~{game.mainStoryPlaytime}h
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                      {game.difficulty}
                    </span>
                  </div>
                </div>

                {/* Card Meta Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {/* Steam Rating & Reviews */}
                    <div className="flex items-center gap-1 text-[11px] mb-1 font-mono">
                      <ThumbsUp className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="font-bold text-cyan-300">{game.reviewPercentage}%</span>
                      <span className="text-slate-500 text-[10px] truncate">({game.reviewCount})</span>
                    </div>

                    {/* Title */}
                    <h4
                      onClick={() => onOpenDetails(game)}
                      className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                      title={game.title}
                    >
                      {game.title}
                    </h4>

                    <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">
                      "{game.tagline}"
                    </p>
                  </div>

                  {/* Card Action Controls */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[80px]">
                      {game.genres[0]}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleBacklog(game, status ? undefined : 'want-to-play')}
                        className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          status
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                        title={status ? `In backlog: ${status}` : 'Add to Want to Play'}
                      >
                        {status ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                      </button>

                      <a
                        href={game.steamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#18202e] hover:bg-[#202c40] text-slate-300 border border-slate-700/80 transition-all cursor-pointer"
                        title="Open on Steam Store"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Cards Grid (Horizontal Banners with Story & Specs) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedGames.map(game => {
            const status = getBacklogStatus(game.id);
            return (
              <div
                key={game.id}
                className="group relative flex flex-col rounded-2xl bg-[#101624] border border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/40 transition-all overflow-hidden"
              >
                {/* Horizontal Banner Image */}
                <div
                  className="relative h-40 w-full overflow-hidden cursor-pointer"
                  onClick={() => onOpenDetails(game)}
                >
                  <img
                    src={game.bannerUrl}
                    alt={game.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => {
                      (e.target as HTMLImageElement).src = game.posterUrl;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101624] via-transparent to-black/30" />

                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white font-mono text-xs border border-white/10">
                    {game.price}
                  </div>

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

                {/* Content with Mini Vertical Poster */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex gap-3">
                    <div
                      onClick={() => onOpenPosterModal?.(game)}
                      className="shrink-0 w-16 aspect-[2/3] rounded-lg overflow-hidden border border-slate-700/80 shadow cursor-pointer group/poster"
                      title="Inspect Original Poster"
                    >
                      <GamePosterImage game={game} alt={`${game.title} thumbnail`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {game.genres.slice(0, 2).map(g => (
                          <span key={g} className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {g}
                          </span>
                        ))}
                      </div>

                      <h3
                        onClick={() => onOpenDetails(game)}
                        className="text-sm font-display font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                      >
                        {game.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <ThumbsUp className="w-3 h-3 text-cyan-400" />
                        <span className="font-semibold text-cyan-300">{game.reviewPercentage}%</span>
                        <span className="text-slate-400 text-[10px]">({game.reviewSentiment})</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    "{game.tagline}"
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenDetails(game)}
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      View Specs & Lore →
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleBacklog(game, status ? undefined : 'want-to-play')}
                        className={`p-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
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
                        className="p-1.5 rounded-lg bg-[#18202e] hover:bg-[#202c40] text-slate-300 border border-slate-700/80 transition-all cursor-pointer"
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

      {/* Pagination Footer Controls (Requirement 3: Every game accessible) */}
      {!isAllPages && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f1422] border border-slate-800 text-xs font-mono shadow-xl">
          <div className="flex items-center gap-1 text-slate-400">
            <span>Page <strong className="text-white">{safeCurrentPage}</strong> of <strong className="text-white">{totalPages}</strong></span>
            <span className="text-slate-600 mx-1">•</span>
            <span>({totalFilteredGames} total matches)</span>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Numeric Page Buttons */}
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(p => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - safeCurrentPage) <= 1) return true;
                return false;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-600">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                        safeCurrentPage === p
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to Page Input */}
          <form onSubmit={handleJumpPage} className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={e => setJumpPageInput(e.target.value)}
              placeholder="#"
              className="w-12 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-center text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
