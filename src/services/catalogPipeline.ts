import { GameItem } from '../types';
import { CURATED_GAMES } from '../data/gamesCatalog';
import autoImportedGamesRaw from '../data/autoImportedGames.json';

export interface CatalogPipelineReport {
  totalSourceRecords: number;
  afterNormalization: number;
  afterDeduplication: number;
  afterValidation: number;
  filteredCount: number;
  displayedCount: number;
  duplicatesRemoved: number;
  invalidRemoved: number;
  duplicateDetails: { title: string; keepId: number; droppedId: number; reason: string }[];
  isHealthy: boolean;
}

/**
 * Normalizes title string for canonical comparison
 */
export function canonicalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/™|®|©/g, '')
    .replace(/[:\-_'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes and validates a single GameItem record.
 * Ensures consistent types, non-null values, valid numeric scores, and proper Steam URLs.
 */
export function normalizeGameItem(raw: any): GameItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const steamAppId = Number(raw.steamAppId) || (raw.id && typeof raw.id === 'string' && raw.id.match(/\d+/) ? Number(raw.id.match(/\d+/)![0]) : 0);
  if (!steamAppId || steamAppId <= 0) return null;

  const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!rawTitle) return null;

  // Clean title from stray markup or artifacts
  const cleanTitle = rawTitle.replace(/<[^>]*>?/gm, '').trim();

  // Stable canonical id
  const slug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const id = `steam-${steamAppId}-${slug || 'game'}`;

  // Verified Steam CDN image endpoints
  const posterUrl = raw.posterUrl || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`;
  const capsuleUrl = raw.capsuleUrl || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/capsule_616x353.jpg`;
  const bannerUrl = raw.bannerUrl || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`;
  const steamUrl = raw.steamUrl || `https://store.steampowered.com/app/${steamAppId}/`;

  // Normalizing scores
  const reviewPercentage = typeof raw.reviewPercentage === 'number' && !isNaN(raw.reviewPercentage)
    ? Math.max(0, Math.min(100, Math.round(raw.reviewPercentage)))
    : 85;

  const reviewSentiment = typeof raw.reviewSentiment === 'string' && raw.reviewSentiment.trim()
    ? raw.reviewSentiment.trim()
    : reviewPercentage >= 95 ? 'Overwhelmingly Positive' : reviewPercentage >= 80 ? 'Very Positive' : 'Positive';

  const reviewCount = typeof raw.reviewCount === 'string' && raw.reviewCount.trim()
    ? raw.reviewCount.trim()
    : '10,000+';

  const mainStoryPlaytime = typeof raw.mainStoryPlaytime === 'number' && !isNaN(raw.mainStoryPlaytime)
    ? Math.max(1, Math.round(raw.mainStoryPlaytime))
    : 15;

  const averagePlaytime = typeof raw.averagePlaytime === 'number' && !isNaN(raw.averagePlaytime)
    ? Math.max(mainStoryPlaytime, Math.round(raw.averagePlaytime))
    : Math.round(mainStoryPlaytime * 1.6);

  const releaseYear = typeof raw.releaseYear === 'number' && !isNaN(raw.releaseYear)
    ? raw.releaseYear
    : 2023;

  const price = typeof raw.price === 'string' && raw.price.trim() ? raw.price.trim() : '$29.99';
  const developer = typeof raw.developer === 'string' && raw.developer.trim() ? raw.developer.trim() : 'Independent Studio';
  const publisher = typeof raw.publisher === 'string' && raw.publisher.trim() ? raw.publisher.trim() : developer;

  const genres: string[] = Array.isArray(raw.genres) && raw.genres.length > 0
    ? Array.from(new Set<string>(raw.genres.map((g: any) => String(g).trim()).filter(Boolean)))
    : ['Action', 'Adventure'];

  const tags: string[] = Array.isArray(raw.tags) && raw.tags.length > 0
    ? Array.from(new Set<string>(raw.tags.map((t: any) => String(t).trim()).filter(Boolean)))
    : genres;

  const difficulty = (['Casual', 'Moderate', 'Challenging', 'Soulslike'] as const).includes(raw.difficulty)
    ? raw.difficulty
    : 'Moderate';

  const singlePlayer = raw.singlePlayer !== undefined ? Boolean(raw.singlePlayer) : true;
  const multiplayer = raw.multiplayer !== undefined ? Boolean(raw.multiplayer) : false;
  const coOp = raw.coOp !== undefined ? Boolean(raw.coOp) : Boolean(raw.coopSupport);
  const hasCrafting = raw.hasCrafting !== undefined ? Boolean(raw.hasCrafting) : false;
  const hasBaseBuilding = raw.hasBaseBuilding !== undefined ? Boolean(raw.hasBaseBuilding) : false;
  const steamDeckVerified = raw.steamDeckVerified !== undefined ? Boolean(raw.steamDeckVerified) : true;

  const priceNum = typeof raw.priceNum === 'number'
    ? raw.priceNum
    : parseFloat(price.replace(/[^0-9.]/g, '') || '29.99');

  const defaultFeatureVector = {
    combatDepth: 0.7,
    narrativeStory: 0.7,
    explorationFreedom: 0.6,
    challengeDifficulty: difficulty === 'Soulslike' ? 0.95 : difficulty === 'Challenging' ? 0.75 : 0.45,
    progressionCrafting: hasCrafting ? 0.8 : 0.2,
    multiplayerSocial: multiplayer ? 0.85 : 0.1,
    horrorTension: genres.includes('Horror') ? 0.9 : 0.2,
    pacingFlow: 0.6,
    sessionScale: mainStoryPlaytime > 50 ? 0.9 : mainStoryPlaytime > 20 ? 0.6 : 0.3,
    replayabilityVariety: 0.8,
    artImmersion: 0.85,
  };

  return {
    id,
    steamAppId,
    title: cleanTitle,
    tagline: raw.tagline || `${cleanTitle} on Steam`,
    description: raw.description || `Experience ${cleanTitle}, featuring rich gameplay and community-praised mechanics.`,
    storySynopsis: raw.storySynopsis || raw.description || `${cleanTitle} offers an engaging world with memorable characters and deep atmosphere.`,
    genres,
    tags,
    featureVector: raw.featureVector || defaultFeatureVector,
    difficulty,
    mainStoryPlaytime,
    averagePlaytime,
    reviewPercentage,
    reviewCount,
    reviewSentiment,
    releaseYear,
    releaseDate: raw.releaseDate || `${releaseYear}-01-01`,
    price,
    priceNum,
    source: 'steam',
    metadataConfidence: typeof raw.metadataConfidence === 'number' ? raw.metadataConfidence : 0.95,
    developer,
    publisher,
    posterUrl,
    capsuleUrl,
    bannerUrl,
    steamUrl,
    singlePlayer,
    multiplayer,
    coopSupport: coOp,
    pvpSupport: raw.pvpSupport !== undefined ? Boolean(raw.pvpSupport) : false,
    moods: Array.isArray(raw.moods) && raw.moods.length > 0 ? raw.moods : ['Engaging'],
    hasCrafting,
    hasJumpScares: Boolean(raw.hasJumpScares),
    hasGrinding: Boolean(raw.hasGrinding),
    artStyle: typeof raw.artStyle === 'string' ? raw.artStyle : 'Stylized 3D',
    platforms: Array.isArray(raw.platforms) && raw.platforms.length > 0 ? raw.platforms : ['Windows'],
    mechanics: Array.isArray(raw.mechanics) ? raw.mechanics : ['Engaging Combat', 'Exploration'],
    themes: Array.isArray(raw.themes) ? raw.themes : ['Atmospheric', 'Immersive'],
    pros: Array.isArray(raw.pros) ? raw.pros : ['Captivating gameplay', 'High Steam community praise'],
    cons: Array.isArray(raw.cons) ? raw.cons : [],
    similarTo: Array.isArray(raw.similarTo) ? raw.similarTo : [],
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : undefined,
    metacriticScore: typeof raw.metacriticScore === 'number' ? raw.metacriticScore : undefined,
    pcRequirements: raw.pcRequirements || undefined,
  };
}

/**
 * Builds a clean, deduplicated, validated catalog from all sources.
 */
export function buildCanonicalCatalog(customImported: GameItem[] = []): {
  catalog: GameItem[];
  report: CatalogPipelineReport;
} {
  // 1. Gather raw pool
  const rawSources: any[] = [
    ...CURATED_GAMES,
    ...((autoImportedGamesRaw as unknown) as any[]),
    ...customImported,
  ];
  const totalSourceRecords = rawSources.length;

  // 2. Normalization
  const normalized: GameItem[] = [];
  let invalidRemoved = 0;
  for (const raw of rawSources) {
    const norm = normalizeGameItem(raw);
    if (norm) {
      normalized.push(norm);
    } else {
      invalidRemoved++;
    }
  }
  const afterNormalization = normalized.length;

  // 3. Deduplication:
  // Step A: Primary key is steamAppId
  const byAppId = new Map<number, GameItem>();
  for (const item of normalized) {
    // If we already have this appId, prefer the version that has more complete data (e.g. curated with pros/cons/features)
    if (byAppId.has(item.steamAppId)) {
      const existing = byAppId.get(item.steamAppId)!;
      const existingWeight = (existing.mechanics?.length || 0) + (existing.pros?.length || 0) + (existing.storySynopsis ? 2 : 0);
      const newWeight = (item.mechanics?.length || 0) + (item.pros?.length || 0) + (item.storySynopsis ? 2 : 0);
      if (newWeight > existingWeight) {
        byAppId.set(item.steamAppId, item);
      }
    } else {
      byAppId.set(item.steamAppId, item);
    }
  }

  // Step B: Canonical Title deduplication (resolves demo/duplicate editions like Factorio 427550 vs 427520)
  const byCanonicalTitle = new Map<string, GameItem>();
  const duplicateDetails: CatalogPipelineReport['duplicateDetails'] = [];

  // Known canonical app ID overrides
  const PREFERRED_APP_IDS: Record<string, number> = {
    'factorio': 427520,
    'armored core vi fires of rubicon': 1887260,
  };

  for (const item of byAppId.values()) {
    const cTitle = canonicalizeTitle(item.title);
    const preferredId = PREFERRED_APP_IDS[cTitle];

    if (byCanonicalTitle.has(cTitle)) {
      const existing = byCanonicalTitle.get(cTitle)!;
      let keep = existing;
      let drop = item;

      if (preferredId && item.steamAppId === preferredId) {
        keep = item;
        drop = existing;
      } else if (preferredId && existing.steamAppId === preferredId) {
        keep = existing;
        drop = item;
      } else {
        // Prefer one with richer features/mechanics
        const existingScore = (existing.pros?.length || 0) + (existing.mechanics?.length || 0);
        const itemScore = (item.pros?.length || 0) + (item.mechanics?.length || 0);
        if (itemScore > existingScore) {
          keep = item;
          drop = existing;
        }
      }

      byCanonicalTitle.set(cTitle, keep);
      duplicateDetails.push({
        title: keep.title,
        keepId: keep.steamAppId,
        droppedId: drop.steamAppId,
        reason: `Canonical title collision: '${drop.title}' (#${drop.steamAppId}) merged into #${keep.steamAppId}`,
      });
    } else {
      byCanonicalTitle.set(cTitle, item);
    }
  }

  const catalog = Array.from(byCanonicalTitle.values());
  const afterDeduplication = catalog.length;
  const duplicatesRemoved = totalSourceRecords - afterDeduplication - invalidRemoved;

  const report: CatalogPipelineReport = {
    totalSourceRecords,
    afterNormalization,
    afterDeduplication,
    afterValidation: afterDeduplication,
    filteredCount: afterDeduplication,
    displayedCount: afterDeduplication,
    duplicatesRemoved,
    invalidRemoved,
    duplicateDetails,
    isHealthy: catalog.length > 0 && invalidRemoved === 0,
  };

  return { catalog, report };
}
