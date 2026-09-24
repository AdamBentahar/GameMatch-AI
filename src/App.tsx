import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { GameAdvisor } from './components/GameAdvisor';
import { AICompanionView } from './components/AICompanionView';
import { EvaluationsView } from './components/EvaluationsView';
import { SquadFinder } from './components/SquadFinder';
import { BacklogView } from './components/BacklogView';
import { SteamStoreExplorer } from './components/SteamStoreExplorer';
import { SteamGamesCodex } from './components/SteamGamesCodex';
import { GameDetailModal } from './components/GameDetailModal';
import { GameItem, BacklogItem } from './types';
import { CURATED_GAMES, ALL_AUTOMATIC_GAMES } from './data/gamesCatalog';
import { buildCanonicalCatalog } from './services/catalogPipeline';

const INITIAL_BACKLOG: BacklogItem[] = [
  {
    game: CURATED_GAMES[0], // Hades II
    status: 'completed',
    rating: 5,
    userNote: 'Masterpiece combat and music.',
    addedAt: '2024-05-10',
  },
  {
    game: CURATED_GAMES[1], // Balatro
    status: 'playing',
    rating: 5,
    userNote: 'Unbelievably addictive deck synergy.',
    addedAt: '2024-03-01',
  },
  {
    game: CURATED_GAMES[3], // Outer Wilds
    status: 'completed',
    rating: 5,
    userNote: 'Best gaming experience of my life.',
    addedAt: '2023-11-20',
  },
  {
    game: CURATED_GAMES[2], // Helldivers 2
    status: 'want-to-play',
    rating: 4,
    addedAt: '2024-06-15',
  }
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('advisor');
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameItem | null>(null);
  const [externalSeed, setExternalSeed] = useState<string | null>(null);

  // Dynamic Canonical Catalog State
  const [catalog, setCatalog] = useState<GameItem[]>(() => {
    try {
      const stored = localStorage.getItem('gamematch_imported_games');
      let extra: GameItem[] = [];
      if (stored) {
        const imported: GameItem[] = JSON.parse(stored);
        if (Array.isArray(imported)) {
          extra = imported;
        }
      }
      const { catalog: initialClean } = buildCanonicalCatalog(extra);
      return initialClean;
    } catch (e) {
      console.warn('Failed to parse stored imported games', e);
    }
    const { catalog: fallbackClean } = buildCanonicalCatalog([]);
    return fallbackClean;
  });

  // Sync catalog from server on initial load
  useEffect(() => {
    fetch('/api/games/catalog')
      .then(res => res.json())
      .then((serverCatalog: GameItem[]) => {
        if (Array.isArray(serverCatalog) && serverCatalog.length > 0) {
          const { catalog: cleanSynced } = buildCanonicalCatalog(serverCatalog);
          setCatalog(cleanSynced);
        }
      })
      .catch(err => console.warn('Could not sync catalog from server:', err));
  }, []);

  // Save imported games to localStorage whenever catalog changes
  useEffect(() => {
    try {
      const existingIds = new Set(ALL_AUTOMATIC_GAMES.map(g => g.steamAppId));
      const customOnly = catalog.filter(g => !existingIds.has(g.steamAppId));
      localStorage.setItem('gamematch_imported_games', JSON.stringify(customOnly));
    } catch (e) {
      console.warn('Failed to persist imported games to localStorage', e);
    }
  }, [catalog]);

  const handleImportGame = (game: GameItem) => {
    setCatalog(prev => {
      if (prev.some(g => g.steamAppId === game.steamAppId || g.id === game.id)) {
        return prev;
      }
      return [game, ...prev];
    });
  };

  const handleBatchImportGames = (games: GameItem[]) => {
    setCatalog(prev => {
      const map = new Map<number, GameItem>();
      prev.forEach(g => map.set(g.steamAppId, g));
      games.forEach(g => map.set(g.steamAppId, g));
      return Array.from(map.values());
    });
  };

  const handleClearImported = () => {
    setCatalog(ALL_AUTOMATIC_GAMES);
    try {
      localStorage.removeItem('gamematch_imported_games');
    } catch (e) {
      console.warn('Failed to clear imported games in localStorage', e);
    }
  };

  // Persistent Backlog in localStorage
  const [backlog, setBacklog] = useState<BacklogItem[]>(() => {
    try {
      const stored = localStorage.getItem('gamematch_backlog');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored backlog', e);
    }
    return INITIAL_BACKLOG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gamematch_backlog', JSON.stringify(backlog));
    } catch (e) {
      console.warn('Failed to save backlog to localStorage', e);
    }
  }, [backlog]);

  const handleToggleBacklog = (game: GameItem, status?: BacklogItem['status']) => {
    setBacklog(prev => {
      if (status === undefined) {
        return prev.filter(b => b.game.id !== game.id);
      }
      const existsIndex = prev.findIndex(b => b.game.id === game.id);
      if (existsIndex >= 0) {
        // Update existing status
        const updated = [...prev];
        updated[existsIndex] = {
          ...updated[existsIndex],
          status,
        };
        return updated;
      } else {
        // Add new
        return [
          {
            game,
            status,
            addedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }
    });
  };

  const handleUpdateStatus = (gameId: string, status: BacklogItem['status']) => {
    setBacklog(prev =>
      prev.map(item => (item.game.id === gameId ? { ...item, status } : item))
    );
  };

  const handleUpdateRating = (gameId: string, rating: number) => {
    setBacklog(prev =>
      prev.map(item => (item.game.id === gameId ? { ...item, rating } : item))
    );
  };

  const handleRemoveFromBacklog = (gameId: string) => {
    setBacklog(prev => prev.filter(item => item.game.id !== gameId));
  };

  const handleSeedAdvisor = (gameTitles: string[]) => {
    if (gameTitles.length > 0) {
      setExternalSeed(gameTitles[0]);
    }
    setActiveTab('advisor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSeedGame = (gameTitle: string) => {
    setExternalSeed(gameTitle);
    setActiveTab('advisor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeBacklogItem = selectedGameForModal
    ? backlog.find(b => b.game.id === selectedGameForModal.id)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backlogCount={backlog.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'advisor' && (
          <GameAdvisor
            catalog={catalog}
            onNavigateToSteamStore={() => setActiveTab('steam-store')}
            onOpenDetails={setSelectedGameForModal}
            backlog={backlog}
            onToggleBacklog={handleToggleBacklog}
            externalSeed={externalSeed}
            onClearExternalSeed={() => setExternalSeed(null)}
          />
        )}

        {activeTab === 'companion' && (
          <AICompanionView
            onOpenDetails={setSelectedGameForModal}
          />
        )}

        {activeTab === 'codex' && (
          <SteamGamesCodex
            catalog={catalog}
            backlog={backlog}
            onToggleBacklog={(game, status) => handleToggleBacklog(game, status || 'want-to-play')}
            onOpenDetails={setSelectedGameForModal}
            onNavigateToSquads={(gameTitle) => setActiveTab('squads')}
            onNavigateToSteamStore={(seedQuery) => {
              if (seedQuery) setExternalSeed(seedQuery);
              setActiveTab('steam-store');
            }}
          />
        )}

        {activeTab === 'steam-store' && (
          <SteamStoreExplorer
            catalog={catalog}
            onImportGame={handleImportGame}
            onBatchImportGames={handleBatchImportGames}
            onOpenDetails={setSelectedGameForModal}
            backlog={backlog}
            onToggleBacklog={handleToggleBacklog}
            onClearImported={handleClearImported}
          />
        )}

        {activeTab === 'evaluations' && (
          <EvaluationsView
            onOpenDetails={setSelectedGameForModal}
          />
        )}

        {activeTab === 'squads' && (
          <SquadFinder />
        )}

        {activeTab === 'backlog' && (
          <BacklogView
            backlog={backlog}
            onUpdateStatus={handleUpdateStatus}
            onUpdateRating={handleUpdateRating}
            onRemoveFromBacklog={handleRemoveFromBacklog}
            onOpenDetails={setSelectedGameForModal}
            onSeedAdvisorWithBacklog={handleSeedAdvisor}
          />
        )}
      </main>

      {/* Game Details Modal */}
      {selectedGameForModal && (
        <GameDetailModal
          game={selectedGameForModal}
          onClose={() => setSelectedGameForModal(null)}
          backlogItem={activeBacklogItem}
          onToggleBacklog={handleToggleBacklog}
          onSelectSeedGame={handleSelectSeedGame}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d15] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-display font-semibold text-slate-300">
              GameMatch AI • Personalized Game Advisor Platform
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Inspired by Adam Bentahar's vision for personalized Steam recommendations and gamer community squad matching.
            </p>
          </div>

          <div className="text-[11px] space-y-1">
            <p>Steam data powered by Steam Web API (100,000+ games) & AI analysis.</p>
            <p className="text-slate-600">All game logos and trademarks belong to their respective publishers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

