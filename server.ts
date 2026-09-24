import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CURATED_GAMES, ALL_AUTOMATIC_GAMES, INITIAL_BEACONS } from './src/data/gamesCatalog';
import { GameItem, TeammateBeacon, ParsedUserIntent, ChatMessage } from './src/types';
import { buildCanonicalCatalog, CatalogPipelineReport } from './src/services/catalogPipeline';
import { getRecommendations } from './src/services/recommendationEngine';
import { processCompanionQuery } from './src/services/aiCompanionService';
import { runAutomatedEvaluations } from './src/services/evaluationSuite';
import { searchSteamStore, importSteamApp, STEAM_BATCH_PRESETS } from './src/services/steamService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// In-memory store for teammate beacons
const activeBeacons: TeammateBeacon[] = [...INITIAL_BEACONS];

// Dynamic imported games store (expands the catalog with on-the-fly imported games from Steam's 100,000+ store)
const importedGamesMap = new Map<string, GameItem>();

export function getFullCatalog(): GameItem[] {
  const custom = Array.from(importedGamesMap.values());
  const { catalog } = buildCanonicalCatalog(custom);
  return catalog;
}

// 0. Catalog Debug Pipeline Check (Requirement 16)
app.get('/api/games/catalog/debug', (req, res) => {
  try {
    const custom = Array.from(importedGamesMap.values());
    const { catalog, report } = buildCanonicalCatalog(custom);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      report: {
        ...report,
        catalogSize: catalog.length,
        customImportedCount: custom.length,
      }
    });
  } catch (error: any) {
    console.error('Error generating catalog debug report:', error);
    res.status(500).json({ error: 'Failed to generate catalog debug report' });
  }
});

// 1. Catalog Endpoint (Auto-resolves and auto-imports from Steam's 100k+ store if not in local catalog)
app.get('/api/games/catalog', async (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  let fullList = getFullCatalog();
  if (!query) {
    return res.json(fullList);
  }
  let filtered = fullList.filter(g =>
    g.title.toLowerCase().includes(query) ||
    g.genres.some(genre => genre.toLowerCase().includes(query)) ||
    g.tags.some(tag => tag.toLowerCase().includes(query))
  );

  // If no match found locally and query has at least 3 characters, automatically search Steam and import!
  if (filtered.length === 0 && query.length >= 3) {
    try {
      const steamResults = await searchSteamStore(query);
      if (steamResults.length > 0) {
        // Auto import the top 2 matches
        for (const item of steamResults.slice(0, 2)) {
          if (!fullList.some(g => g.steamAppId === item.id)) {
            const imported = await importSteamApp(item.id);
            if (imported) {
              importedGamesMap.set(imported.id, imported);
            }
          }
        }
        fullList = getFullCatalog();
        filtered = fullList.filter(g =>
          g.title.toLowerCase().includes(query) ||
          g.genres.some(genre => genre.toLowerCase().includes(query)) ||
          g.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
    } catch (e) {
      console.warn('Auto-import on search error:', e);
    }
  }

  res.json(filtered);
});

// 2. Steam 100,000+ Store Live Search
app.get('/api/steam/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [], total: 0 });
  }

  try {
    const results = await searchSteamStore(query);
    // Mark if already in local catalog
    const full = getFullCatalog();
    const mapped = results.map(r => ({
      ...r,
      isImported: full.some(cg => cg.steamAppId === r.id),
    }));
    res.json({ results: mapped, total: mapped.length });
  } catch (err: any) {
    console.error('Error searching Steam store:', err);
    res.status(500).json({ error: 'Failed to search Steam Store' });
  }
});

// 3. Import Specific Steam App Details
app.get('/api/steam/app/:appid', async (req, res) => {
  const appId = parseInt(req.params.appid, 10);
  if (isNaN(appId)) {
    return res.status(400).json({ error: 'Invalid AppID' });
  }

  // Check if already in memory
  const existing = getFullCatalog().find(g => g.steamAppId === appId);
  if (existing) {
    return res.json({ game: existing, fromCache: true });
  }

  try {
    const imported = await importSteamApp(appId);
    if (!imported) {
      return res.status(404).json({ error: `Could not fetch or import game with AppID ${appId}` });
    }
    importedGamesMap.set(imported.id, imported);
    res.json({ game: imported, fromCache: false, totalCatalogSize: getFullCatalog().length });
  } catch (err: any) {
    console.error(`Error importing Steam game ${appId}:`, err);
    res.status(500).json({ error: 'Failed to import Steam app' });
  }
});

// 3.5 Full Deep-Dive (High-res Screenshots, Full Lore/Story, Metacritic, PC Hardware Specs)
app.get('/api/games/:appid/deep-dive', async (req, res) => {
  const appId = parseInt(req.params.appid, 10);
  if (isNaN(appId)) return res.status(400).json({ error: 'Invalid AppID' });

  try {
    const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`;
    const response = await fetch(detailUrl);
    if (!response.ok) return res.status(502).json({ error: 'Failed to contact Steam' });
    const json = await response.json();
    const app = json[appId]?.data;
    if (!app) return res.status(404).json({ error: 'Game not found on Steam' });

    const screenshots = Array.isArray(app.screenshots)
      ? app.screenshots.map((s: any, idx: number) => ({
          id: s.id ?? idx,
          thumbnail: s.path_thumbnail || s.path_full,
          full: s.path_full,
        }))
      : [];

    const storySynopsis = (app.detailed_description || app.about_the_game || app.short_description || '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const pcRequirements = {
      minimum: app.pc_requirements?.minimum ? app.pc_requirements.minimum.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : undefined,
      recommended: app.pc_requirements?.recommended ? app.pc_requirements.recommended.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : undefined,
    };

    // Update in-memory item if found in catalog
    const existing = getFullCatalog().find(g => g.steamAppId === appId);
    if (existing) {
      if (!existing.screenshots || existing.screenshots.length === 0) existing.screenshots = screenshots;
      if (!existing.storySynopsis) existing.storySynopsis = storySynopsis;
      if (app.metacritic?.score) existing.metacriticScore = app.metacritic.score;
      if (!existing.pcRequirements) existing.pcRequirements = pcRequirements;
      if (app.supported_languages) existing.supportedLanguages = app.supported_languages.replace(/<[^>]*>?/gm, '').trim();
      if (app.controller_support) existing.controllerSupport = app.controller_support === 'full' ? 'Full Controller Support' : 'Partial Controller Support';
    }

    res.json({
      appId,
      name: app.name,
      screenshots,
      storySynopsis,
      shortDescription: app.short_description,
      metacritic: app.metacritic,
      pcRequirements,
      supportedLanguages: app.supported_languages ? app.supported_languages.replace(/<[^>]*>?/gm, '').trim() : undefined,
      controllerSupport: app.controller_support,
      releaseDate: app.release_date?.date,
      developers: app.developers,
      publishers: app.publishers,
      website: app.website,
    });
  } catch (err: any) {
    console.error(`Error in deep-dive for ${appId}:`, err);
    res.status(500).json({ error: 'Failed to fetch deep dive data' });
  }
});

// 4. Batch Import from Steam (by AppIDs, URLs, or Title strings)
app.post('/api/steam/import', async (req, res) => {
  try {
    const { appIds = [], titles = [], url = '' } = req.body;
    const targetAppIds: number[] = [...appIds];

    // If URL was provided, extract AppID (e.g., https://store.steampowered.com/app/1091500/...)
    if (url) {
      const match = url.match(/\/app\/(\d+)/);
      if (match) {
        targetAppIds.push(parseInt(match[1], 10));
      }
    }

    // If titles were provided, search Steam store and pick top match
    if (Array.isArray(titles) && titles.length > 0) {
      for (const t of titles) {
        if (!t || typeof t !== 'string') continue;
        const searchRes = await searchSteamStore(t);
        if (searchRes.length > 0) {
          targetAppIds.push(searchRes[0].id);
        }
      }
    }

    const uniqueIds = Array.from(new Set(targetAppIds));
    const importedGames: GameItem[] = [];

    for (const id of uniqueIds) {
      const existing = getFullCatalog().find(g => g.steamAppId === id);
      if (existing) {
        importedGames.push(existing);
        continue;
      }
      const imported = await importSteamApp(id);
      if (imported) {
        importedGamesMap.set(imported.id, imported);
        importedGames.push(imported);
      }
    }

    res.json({
      success: true,
      importedCount: importedGames.length,
      imported: importedGames,
      totalCatalogSize: getFullCatalog().length,
    });
  } catch (err: any) {
    console.error('Error in batch Steam import:', err);
    res.status(500).json({ error: 'Failed to complete batch import' });
  }
});

// 5. Steam Batch Presets (Top 100, Masterpieces, Trending, Cozy)
app.get('/api/steam/presets', (_req, res) => {
  res.json({ presets: STEAM_BATCH_PRESETS });
});

app.post('/api/steam/import-preset', async (req, res) => {
  try {
    const { presetId } = req.body;
    const preset = STEAM_BATCH_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const imported: GameItem[] = [];
    for (const appId of preset.appIds) {
      const existing = getFullCatalog().find(g => g.steamAppId === appId);
      if (existing) {
        imported.push(existing);
        continue;
      }
      const item = await importSteamApp(appId);
      if (item) {
        importedGamesMap.set(item.id, item);
        imported.push(item);
      }
    }

    res.json({
      success: true,
      presetName: preset.name,
      importedCount: imported.length,
      imported,
      totalCatalogSize: getFullCatalog().length,
    });
  } catch (err: any) {
    console.error('Error importing preset:', err);
    res.status(500).json({ error: 'Failed to import preset' });
  }
});

// 6. Hybrid AI Recommendation Engine Endpoint
app.post('/api/recommendations', (req, res) => {
  try {
    const {
      prompt = '',
      mood = 'Any',
      playStyle = 'Any',
      genres = [],
      likedGames = [],
      hatedGames = [],
      maxPrice = 100,
      minReviewScore = 80,
      limit = 6,
    } = req.body;

    const fullCatalog = getFullCatalog();
    const result = getRecommendations(prompt, {
      mood,
      playStyle,
      genres,
      likedGames,
      hatedGames,
      maxPrice,
      minReviewScore,
      limit,
      catalog: fullCatalog,
    });

    res.json({
      source: 'game-match-hybrid-engine',
      intent: result.intent,
      recommendations: result.recommendations,
      filteredCount: result.filteredCount,
      totalPoolEvaluated: fullCatalog.length,
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to process recommendations' });
  }
});

// 3. Truthful AI Companion Endpoint (Comparisons, Factual Q&A, Multi-turn Follow-ups)
app.post('/api/companion', async (req, res) => {
  try {
    const {
      query = '',
      history = [],
      activeIntent,
    } = req.body;

    if (!query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await processCompanionQuery(
      query,
      history as ChatMessage[],
      activeIntent as Partial<ParsedUserIntent> | undefined
    );

    res.json(response);
  } catch (error: any) {
    console.error('Error in AI companion:', error);
    res.status(500).json({ error: 'Failed to process AI companion message' });
  }
});

// 4. Automated Evaluation Suite Endpoint (Golden Test Queries)
app.get('/api/evaluations', (req, res) => {
  try {
    const testResults = runAutomatedEvaluations();
    const passedCount = testResults.filter(r => r.verdict === 'PASS').length;
    res.json({
      total: testResults.length,
      passed: passedCount,
      accuracy: Math.round((passedCount / testResults.length) * 100),
      results: testResults,
    });
  } catch (error: any) {
    console.error('Error running evaluations:', error);
    res.status(500).json({ error: 'Failed to run evaluations' });
  }
});

// 5. Teammate Finder Beacons
app.get('/api/teammates', (req, res) => {
  const { gameId, playStyle, micRequired } = req.query;
  let results = [...activeBeacons];

  if (gameId && gameId !== 'all') {
    results = results.filter(b => b.gameId === gameId);
  }
  if (playStyle && playStyle !== 'all') {
    results = results.filter(b => b.playStyle === playStyle);
  }
  if (micRequired === 'true') {
    results = results.filter(b => b.micRequired === true);
  }

  res.json(results);
});

app.post('/api/teammates/create', (req, res) => {
  const {
    gameId,
    gameTitle,
    creatorName,
    creatorAvatar = '🎮',
    creatorRank = 'Adventurer',
    gamerPersona = 'Team Strategist',
    title,
    description,
    playStyle = 'Casual',
    micRequired = true,
    slotsMax = 4,
    region = 'Global',
    language = 'English',
    tags = [],
  } = req.body;

  if (!title || !gameTitle || !creatorName) {
    return res.status(400).json({ error: 'Title, game, and username are required' });
  }

  const newBeacon: TeammateBeacon = {
    id: `beacon-${Date.now()}`,
    gameId: gameId || 'custom',
    gameTitle,
    creatorName,
    creatorAvatar,
    creatorRank,
    gamerPersona,
    title,
    description: description || 'Looking for fellow players to squad up!',
    playStyle: playStyle as any,
    micRequired: Boolean(micRequired),
    slotsCurrent: 1,
    slotsMax: Number(slotsMax) || 4,
    region,
    language,
    createdAt: 'Just now',
    tags: tags.length ? tags : ['LFG', 'Co-op'],
  };

  activeBeacons.unshift(newBeacon);
  res.json({ success: true, beacon: newBeacon });
});

// 6. Join a Beacon Slot
app.post('/api/teammates/:id/join', (req, res) => {
  const { id } = req.params;
  const { userName = 'Fellow Gamer' } = req.body;
  const beacon = activeBeacons.find(b => b.id === id);

  if (!beacon) {
    return res.status(404).json({ error: 'Beacon not found' });
  }

  if (beacon.slotsCurrent >= beacon.slotsMax) {
    return res.status(400).json({ error: 'Squad is already full' });
  }

  beacon.slotsCurrent += 1;
  res.json({
    success: true,
    message: `You joined ${beacon.creatorName}'s squad for ${beacon.gameTitle}!`,
    slotsCurrent: beacon.slotsCurrent,
  });
});

// 7. Gamer DNA Radar & Archetype Calculator
app.post('/api/gamer-dna', (req, res) => {
  const { ratedGames = [] } = req.body;

  if (!ratedGames.length) {
    return res.json({
      persona: 'Versatile Explorer',
      badge: '🧭',
      description: 'Your taste is broad and versatile. You love diving into fresh worlds across multiple genres.',
      topGenres: ['Adventure', 'RPG', 'Indie'],
      playStyleArchetype: 'Curious Pioneer',
      radarProfile: {
        combatDepth: 65,
        narrativeStory: 75,
        explorationFreedom: 85,
        challengeDifficulty: 60,
        progressionCrafting: 50,
        multiplayerSocial: 45,
        horrorTension: 30,
        pacingFlow: 70,
        sessionScale: 60,
        replayabilityVariety: 70,
        artImmersion: 85,
      },
    });
  }

  // Calculate genre weights
  const genreCount: Record<string, number> = {};
  const radarSums: Record<string, number> = {
    combatDepth: 0,
    narrativeStory: 0,
    explorationFreedom: 0,
    challengeDifficulty: 0,
    progressionCrafting: 0,
    multiplayerSocial: 0,
    horrorTension: 0,
    pacingFlow: 0,
    sessionScale: 0,
    replayabilityVariety: 0,
    artImmersion: 0,
  };

  ratedGames.forEach((g: any) => {
    const genres = g.genres || [];
    const ratingWeight = g.rating || 4;
    genres.forEach((genre: string) => {
      genreCount[genre] = (genreCount[genre] || 0) + ratingWeight;
    });

    const catalogGame = getFullCatalog().find(cg => cg.id === g.id || cg.title.toLowerCase() === (g.title || '').toLowerCase());
    const vector = catalogGame ? catalogGame.featureVector : g.featureVector;
    if (vector) {
      for (const [k, v] of Object.entries(vector)) {
        if (radarSums[k] !== undefined && typeof v === 'number') {
          radarSums[k] += v * ratingWeight;
        }
      }
    }
  });

  const count = ratedGames.length || 1;
  const radarProfile: Record<string, number> = {};
  for (const [k, v] of Object.entries(radarSums)) {
    radarProfile[k] = Math.round((v / (count * 4)) * 100);
  }

  const sortedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const topGenre = sortedGenres[0] || 'Adventure';

  let persona = 'Dynamic Challenger';
  let badge = '⚔️';
  let description = 'You balance intense combat mastery with deep strategic systems.';
  let playStyleArchetype = 'Balanced Competitor';

  if (topGenre.includes('Roguelike') || topGenre.includes('Deckbuilder')) {
    persona = 'Synergy Alchemist';
    badge = '🃏';
    description = 'You obsess over broken synergies, mathematical theorycrafting, and one-more-run loops.';
    playStyleArchetype = 'Master Theorist';
  } else if (topGenre.includes('RPG') || topGenre.includes('Story')) {
    persona = 'Lore Cartographer';
    badge = '📜';
    description = 'You prioritize rich character arcs, meaningful dialogue choices, and narrative immersion.';
    playStyleArchetype = 'Story Enthusiast';
  } else if (topGenre.includes('Strategy') || topGenre.includes('Automation')) {
    persona = 'Grand Architect';
    badge = '⚙️';
    description = 'You see games as optimization problems to solve, conveyor belts to streamline, and empires to command.';
    playStyleArchetype = 'Systems Engineer';
  } else if (topGenre.includes('Co-op') || topGenre.includes('Survival')) {
    persona = 'Squad Vanguard';
    badge = '🛡️';
    description = 'You thrive in tight-knit co-op dynamics, chaotic extractions, and shared team triumphs.';
    playStyleArchetype = 'Team Anchor';
  }

  res.json({
    persona,
    badge,
    description,
    topGenres: sortedGenres.slice(0, 3),
    playStyleArchetype,
    radarProfile,
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[GameMatch AI] Server running at http://${HOST}:${PORT}`);
  });
}

startServer();
