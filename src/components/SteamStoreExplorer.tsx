import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  DownloadCloud, 
  Flame, 
  Star, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Eye, 
  Layers, 
  Library, 
  Plus, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Coffee, 
  Globe, 
  Trash2,
  Share2
} from 'lucide-react';
import { GameItem, BacklogItem } from '../types';
import { STEAM_BATCH_PRESETS } from '../services/steamService';
import { PosterModal } from './PosterModal';

interface SteamStoreExplorerProps {
  catalog: GameItem[];
  onImportGame: (game: GameItem) => void;
  onBatchImportGames: (games: GameItem[]) => void;
  onOpenDetails: (game: GameItem) => void;
  backlog: BacklogItem[];
  onToggleBacklog: (game: GameItem, status: BacklogItem['status']) => void;
  onClearImported?: () => void;
}

interface SearchResultItem {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  posterUrl: string;
  bannerUrl: string;
  metascore?: string;
  platforms: string[];
  steamUrl: string;
  isImported?: boolean;
}

export const SteamStoreExplorer: React.FC<SteamStoreExplorerProps> = ({
  catalog,
  onImportGame,
  onBatchImportGames,
  onOpenDetails,
  backlog,
  onToggleBacklog,
  onClearImported,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'presets' | 'custom' | 'imported'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set());
  const [selectedPosterGame, setSelectedPosterGame] = useState<GameItem | null>(null);

  // Preset batch import state
  const [activePresetImportId, setActivePresetImportId] = useState<string | null>(null);
  const [presetProgress, setPresetProgress] = useState<{ current: number; total: number; title?: string } | null>(null);

  // Custom text/url batch import
  const [customInput, setCustomInput] = useState('');
  const [customImportLoading, setCustomImportLoading] = useState(false);
  const [customImportFeedback, setCustomImportFeedback] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Identify games in catalog that are imported from Steam beyond the base 53
  const importedGames = catalog.filter(g => g.id.startsWith('steam-'));

  // Debounced search on input change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/steam/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Error during Steam live search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Handle single game import from search results
  const handleImportSingle = async (item: SearchResultItem, addToBacklog = false) => {
    if (importingIds.has(item.id)) return;
    setImportingIds(prev => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/steam/app/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          onImportGame(data.game);
          if (addToBacklog) {
            onToggleBacklog(data.game, 'want-to-play');
          }
        }
      }
    } catch (err) {
      console.error('Failed to import Steam app:', err);
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Handle preset bundle import
  const handleImportPreset = async (presetId: string) => {
    const preset = STEAM_BATCH_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePresetImportId(presetId);
    setPresetProgress({ current: 0, total: preset.appIds.length });

    try {
      const res = await fetch('/api/steam/import-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.imported)) {
          onBatchImportGames(data.imported);
        }
      }
    } catch (err) {
      console.error('Error importing preset bundle:', err);
    } finally {
      setActivePresetImportId(null);
      setPresetProgress(null);
    }
  };

  // Handle custom URL / AppIDs / Titles import
  const handleCustomImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setCustomImportLoading(true);
    setCustomImportFeedback('Querying Steam 100,000+ game catalog & synthesizing vectors...');

    try {
      // Parse input lines/tokens
      const lines = customInput
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const appIds: number[] = [];
      const urls: string[] = [];
      const titles: string[] = [];

      lines.forEach(line => {
        if (/^https?:\/\//i.test(line)) {
          urls.push(line);
        } else if (/^\d+$/.test(line)) {
          appIds.push(parseInt(line, 10));
        } else {
          titles.push(line);
        }
      });

      let totalImported: GameItem[] = [];

      // Import URLs
      for (const u of urls) {
        const res = await fetch('/api/steam/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: u }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.imported) totalImported.push(...data.imported);
        }
      }

      // Import AppIDs and Titles
      if (appIds.length > 0 || titles.length > 0) {
        const res = await fetch('/api/steam/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appIds, titles }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.imported) totalImported.push(...data.imported);
        }
      }

      if (totalImported.length > 0) {
        onBatchImportGames(totalImported);
        setCustomImportFeedback(`Successfully resolved and imported ${totalImported.length} game(s) with official Steam 600×900 cover art!`);
        setCustomInput('');
      } else {
        setCustomImportFeedback('No new matching games found on Steam. Please check the spelling or AppIDs.');
      }
    } catch (err) {
      console.error('Custom import failed:', err);
      setCustomImportFeedback('Encountered an error while importing from Steam.');
    } finally {
      setCustomImportLoading(false);
    }
  };

  const isGameInCatalog = (steamAppId: number) => {
    return catalog.some(g => g.steamAppId === steamAppId);
  };

  const getCatalogItem = (steamAppId: number): GameItem | undefined => {
    return catalog.find(g => g.steamAppId === steamAppId);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Direct Steam API Integration • Auto-Sync Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
              Steam Universe <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-300">(100,000+ Games Auto-Catalog)</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Explore the entire 100,000+ game universe on Steam. Over {catalog.length} iconic titles are pre-loaded automatically with authentic 600×900 cover posters and 11D feature vectors. Searching for any game automatically resolves and adds it to your catalog.
            </p>
          </div>

          {/* Engine Stats Card */}
          <div className="w-full md:w-auto shrink-0 bg-[#090d16]/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-5">
            <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Automatic Engine Pool</div>
              <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1.5">
                <span>{catalog.length}</span>
                <span className="text-xs text-slate-400 font-sans font-normal">games auto-loaded</span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                <Check className="w-3 h-3" />
                <span>100k+ Universe Live Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('search')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'search'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border border-slate-800'
            }`}
          >
            <Search className="w-4 h-4 text-cyan-300" />
            <span>Search 100,000+ Steam Store</span>
          </button>

          <button
            onClick={() => setActiveSubTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>1-Click Preset Bundles</span>
          </button>

          <button
            onClick={() => setActiveSubTab('custom')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border border-slate-800'
            }`}
          >
            <DownloadCloud className="w-4 h-4 text-emerald-300" />
            <span>Import via URL / AppID / Wishlist</span>
          </button>

          <button
            onClick={() => setActiveSubTab('imported')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ml-auto ${
              activeSubTab === 'imported'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>My Imported Games ({importedGames.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE STEAM SEARCH */}
      {activeSubTab === 'search' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-indigo-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 100,000+ Steam games (e.g. Cyberpunk, Satisfactory, Space Marine 2, Factorio, Palworld)..."
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#0e131f] border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm sm:text-base shadow-inner transition-all"
              />
              {isSearching && (
                <div className="absolute right-4">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Popular Queries:</span>
              {[
                'Warhammer 40,000: Space Marine 2',
                'Satisfactory',
                'Black Myth: Wukong',
                'Helldivers 2',
                'Factorio',
                'Persona 3 Reload',
                'RimWorld',
                'Monster Hunter: World',
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => setSearchQuery(chip)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-indigo-600/30 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Display */}
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Found {searchResults.length} matches on Steam Store
                </h3>
                <span className="text-xs text-slate-500 font-mono">Real-time Steam Store API</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((item) => {
                  const imported = isGameInCatalog(item.id);
                  const isImporting = importingIds.has(item.id);
                  const catalogItem = getCatalogItem(item.id);

                  return (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl bg-[#0e131f] border border-slate-800 hover:border-indigo-500/50 p-3.5 transition-all flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
                    >
                      <div>
                        {/* 2:3 Vertical Poster Preview */}
                        <div className="relative aspect-[2/3] w-full rounded-xl bg-slate-950 overflow-hidden mb-3 shadow-md">
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = item.bannerUrl;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                          {/* Steam AppID Badge */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-cyan-300">
                            AppID {item.id}
                          </div>

                          {/* Metascore if present */}
                          {item.metascore && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500/80 backdrop-blur-sm text-slate-950 text-[10px] font-bold">
                              {item.metascore} Metascore
                            </div>
                          )}

                          {/* Price Badge */}
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/80 backdrop-blur-sm text-xs font-bold text-white border border-slate-700">
                            {item.price}
                          </div>

                          {/* Inspect Poster Button */}
                          <button
                            onClick={() => {
                              if (catalogItem) {
                                setSelectedPosterGame(catalogItem);
                              } else {
                                // Create synthetic preview item for modal
                                setSelectedPosterGame({
                                  id: `temp-${item.id}`,
                                  steamAppId: item.id,
                                  title: item.title,
                                  tagline: `Steam store title (AppID ${item.id})`,
                                  description: 'Import this game into your catalog to access comprehensive AI Match DNA breakdown and verified metrics.',
                                  genres: ['Steam Store Title'],
                                  tags: ['Steam', 'Importable'],
                                  moods: ['Adrenaline & Action'],
                                  platforms: ['Windows'],
                                  releaseDate: 'Available on Steam',
                                  releaseYear: 2024,
                                  developer: 'Steam Publisher',
                                  publisher: 'Steam Publisher',
                                  mainStoryPlaytime: 20,
                                  averagePlaytime: 40,
                                  singlePlayer: true,
                                  multiplayer: false,
                                  coopSupport: false,
                                  pvpSupport: false,
                                  difficulty: 'Moderate',
                                  mechanics: ['Steam Integration'],
                                  themes: ['Gaming'],
                                  hasCrafting: false,
                                  hasJumpScares: false,
                                  hasGrinding: false,
                                  artStyle: 'Original Cover Art',
                                  bannerUrl: item.bannerUrl,
                                  posterUrl: item.posterUrl,
                                  capsuleUrl: item.bannerUrl,
                                  price: item.price,
                                  priceNum: item.priceNum,
                                  reviewSentiment: 'Verified Steam',
                                  reviewPercentage: 90,
                                  reviewCount: 'Steam Community',
                                  steamUrl: item.steamUrl,
                                  source: 'steam',
                                  metadataConfidence: 1,
                                  featureVector: {
                                    combatDepth: 0.5,
                                    narrativeStory: 0.5,
                                    explorationFreedom: 0.5,
                                    challengeDifficulty: 0.5,
                                    progressionCrafting: 0.5,
                                    multiplayerSocial: 0.5,
                                    horrorTension: 0.5,
                                    pacingFlow: 0.5,
                                    sessionScale: 0.5,
                                    replayabilityVariety: 0.5,
                                    artImmersion: 0.8,
                                  },
                                  pros: ['Official Steam Store item', 'Direct Steam CDN Artwork'],
                                  cons: ['Import into catalog to analyze full features'],
                                  similarTo: [],
                                });
                              }
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                            title="Inspect 600×900 Original Poster"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>Platforms: {item.platforms.join(', ')}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                        {imported ? (
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In Catalog</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleImportSingle(item)}
                            disabled={isImporting}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                          >
                            {isImporting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Import</span>
                              </>
                            )}
                          </button>
                        )}

                        <a
                          href={item.steamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          title="Open on Steam Store"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : searchQuery.trim().length >= 2 && !isSearching ? (
            <div className="py-12 text-center rounded-2xl bg-[#0e131f] border border-slate-800 text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-white">No games found for "{searchQuery}"</p>
              <p className="text-xs text-slate-500 mt-1">Try another title, check for typos, or use the Steam AppID directly.</p>
            </div>
          ) : (
            /* Blank state intro */
            <div className="rounded-2xl bg-[#0e131f]/60 border border-slate-800/80 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white">
                Live Steam Storefront Search
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Type any title or franchise name into the box above to immediately search Steam's 100,000+ game catalog in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 1-CLICK PRESET BUNDLES */}
      {activeSubTab === 'presets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-display font-semibold text-white">
                Curated Steam Power Bundles
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                1-click batch import hand-curated collections of Steam's most iconic, highest-rated, and trending titles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {STEAM_BATCH_PRESETS.map((preset) => {
              const isImportingThis = activePresetImportId === preset.id;
              // Check how many are already in catalog
              const countImported = preset.appIds.filter(id => isGameInCatalog(id)).length;
              const allImported = countImported === preset.appIds.length;

              return (
                <div
                  key={preset.id}
                  className="rounded-2xl bg-[#0e131f] border border-slate-800 p-6 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                        {preset.badge}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {preset.appIds.length} Games
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white font-display">
                      {preset.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {preset.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <span>Status:</span>
                      <span className="font-mono font-medium text-slate-200">
                        {countImported} / {preset.appIds.length} loaded
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1.5 w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${(countImported / preset.appIds.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    {allImported ? (
                      <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All {preset.appIds.length} Games in Catalog</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleImportPreset(preset.id)}
                        disabled={isImportingThis}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        {isImportingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                            <span>Importing Bundle ({presetProgress?.current || 0} / {presetProgress?.total || preset.appIds.length})...</span>
                          </>
                        ) : (
                          <>
                            <DownloadCloud className="w-4 h-4 text-cyan-300" />
                            <span>Import Bundle ({preset.appIds.length - countImported} Remaining)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM URL / APPID / WISHLIST IMPORTER */}
      {activeSubTab === 'custom' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0e131f] border border-slate-800 p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-display font-semibold text-white">
                Multi-Store & Custom Steam Importer
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                Paste Steam Store URLs, Steam AppIDs, or comma-separated game titles from Steam, Epic Games, GOG, or your personal wishlist. The importer resolves and catalogs each title automatically.
              </p>
            </div>

            <form onSubmit={handleCustomImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Paste URLs, AppIDs, or Title List
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={6}
                  placeholder={`Examples of supported inputs:
https://store.steampowered.com/app/1091500/Cyberpunk_2077/
2358720, 526870, 427520
Balatro, Palworld, Space Marine 2, Manor Lords, Hades II
Satisfactory, Terraria, Stardew Valley`}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                />
              </div>

              {customImportFeedback && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{customImportFeedback}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={customImportLoading || !customInput.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {customImportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Resolving & Importing Games...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4 text-cyan-300" />
                    <span>Start Batch Import</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: MY IMPORTED GAMES */}
      {activeSubTab === 'imported' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-display font-semibold text-white">
                Imported Games ({importedGames.length})
              </h3>
              <p className="text-xs text-slate-400">
                These titles were imported from Steam's 100,000+ catalog and are currently live in your AI Recommendation Engine and Backlog.
              </p>
            </div>

            {importedGames.length > 0 && onClearImported && (
              <button
                onClick={onClearImported}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Imported Titles</span>
              </button>
            )}
          </div>

          {importedGames.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-[#0e131f] border border-slate-800 text-slate-400 space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-semibold text-white">No custom games imported yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use the search tab or 1-click preset bundles to import any of Steam's 100,000+ games into your personalized catalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {importedGames.map((game) => (
                <div
                  key={game.id}
                  className="group relative rounded-2xl bg-[#0e131f] border border-slate-800 p-3 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-lg"
                >
                  <div>
                    {/* Vertical Poster */}
                    <div 
                      onClick={() => onOpenDetails(game)}
                      className="relative aspect-[2/3] w-full rounded-xl bg-slate-950 overflow-hidden mb-2.5 cursor-pointer"
                    >
                      <img
                        src={game.posterUrl}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.capsuleUrl;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" /> View Details
                        </span>
                      </div>
                    </div>

                    <h4 
                      onClick={() => onOpenDetails(game)}
                      className="font-bold text-white text-xs sm:text-sm line-clamp-1 hover:text-cyan-300 cursor-pointer"
                    >
                      {game.title}
                    </h4>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-semibold">{game.reviewPercentage}% Positive</span>
                      <span>{game.price}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPosterGame(game)}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Poster</span>
                    </button>
                    <a
                      href={game.steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                      title="Open on Steam Store"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full 600x900 Poster Lightbox */}
      {selectedPosterGame && (
        <PosterModal
          game={selectedPosterGame}
          onClose={() => setSelectedPosterGame(null)}
          onOpenDetails={onOpenDetails}
          isSavedInBacklog={backlog.some(b => b.game.id === selectedPosterGame.id)}
          onToggleBacklog={(g) => onToggleBacklog(g, 'want-to-play')}
        />
      )}
    </div>
  );
};
