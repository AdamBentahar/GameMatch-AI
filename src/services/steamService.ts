import { GameItem, GameScreenshot, GameFeatureVector, Platform, GameDifficulty } from '../types';

export interface SteamSearchResult {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  posterUrl: string;
  bannerUrl: string;
  metascore?: string;
  platforms: Platform[];
  steamUrl: string;
}

/**
 * Searches the entire live 100,000+ Steam Store database.
 */
export async function searchSteamStore(query: string): Promise<SteamSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query.trim())}&l=english&cc=US`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Steam store search failed with status: ${res.status}`);
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => {
      const appId = item.id;
      let priceStr = 'Free to Play';
      let priceNum = 0;
      if (item.price) {
        priceNum = (item.price.final || item.price.initial || 0) / 100;
        priceStr = priceNum === 0 ? 'Free to Play' : `$${priceNum.toFixed(2)}`;
      }

      const platforms: Platform[] = ['Windows'];
      if (item.platforms?.mac) platforms.push('Mac');
      if (item.platforms?.linux) platforms.push('Linux', 'Steam Deck');

      return {
        id: appId,
        title: item.name,
        price: priceStr,
        priceNum,
        posterUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
        bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
        metascore: item.metascore || undefined,
        platforms,
        steamUrl: `https://store.steampowered.com/app/${appId}/`,
      };
    });
  } catch (err) {
    console.error('Failed to search Steam store:', err);
    return [];
  }
}

/**
 * Synthesizes an 11-dimensional feature vector for any game on Steam based on its tags, genres, and categories.
 */
export function synthesizeFeatureVector(
  genres: string[],
  categories: string[],
  description: string,
  difficulty: GameDifficulty
): GameFeatureVector {
  const g = genres.map(x => x.toLowerCase());
  const c = categories.map(x => x.toLowerCase());
  const d = description.toLowerCase();

  // 1. Combat Depth
  let combat = 0.4;
  if (g.includes('action') || g.includes('fps') || d.includes('combat') || d.includes('melee') || d.includes('shooting')) combat += 0.3;
  if (difficulty === 'Soulslike' || d.includes('parry') || d.includes('combo') || d.includes('dodge')) combat += 0.2;
  if (g.includes('puzzle') || g.includes('casual') || g.includes('simulation')) combat -= 0.3;

  // 2. Narrative Story
  let story = 0.4;
  if (g.includes('rpg') || g.includes('adventure') || d.includes('story') || d.includes('narrative') || d.includes('character')) story += 0.35;
  if (d.includes('dialogue') || d.includes('branching') || d.includes('voice acting') || d.includes('lore')) story += 0.2;
  if (g.includes('fps') || g.includes('racing') || g.includes('sports')) story -= 0.2;

  // 3. Exploration Freedom
  let exploration = 0.4;
  if (g.includes('open world') || d.includes('open world') || d.includes('sandbox') || d.includes('explore')) exploration += 0.4;
  if (g.includes('survival') || g.includes('adventure')) exploration += 0.15;
  if (d.includes('linear') || g.includes('puzzle') || g.includes('strategy')) exploration -= 0.2;

  // 4. Challenge Difficulty
  let challenge = 0.5;
  if (difficulty === 'Soulslike') challenge = 0.95;
  else if (difficulty === 'Challenging') challenge = 0.8;
  else if (difficulty === 'Casual') challenge = 0.25;
  else if (g.includes('roguelike') || d.includes('permadeath') || d.includes('punishing')) challenge += 0.25;

  // 5. Progression Crafting
  let crafting = 0.25;
  if (d.includes('crafting') || d.includes('build') || d.includes('gather') || g.includes('survival')) crafting += 0.5;
  if (d.includes('upgrade') || d.includes('loot') || g.includes('rpg')) crafting += 0.25;

  // 6. Multiplayer Social
  let multiplayer = 0.1;
  if (c.some(cat => cat.includes('multi-player') || cat.includes('co-op') || cat.includes('mmo') || cat.includes('pvp'))) multiplayer += 0.6;
  if (c.some(cat => cat.includes('online co-op') || cat.includes('cross-platform'))) multiplayer += 0.25;

  // 7. Horror Tension
  let horror = 0.1;
  if (g.includes('horror') || d.includes('horror') || d.includes('terror') || d.includes('dread') || d.includes('psychological')) horror += 0.7;
  if (d.includes('jump scare') || d.includes('survival horror')) horror += 0.2;

  // 8. Pacing Flow
  let pacing = 0.5;
  if (g.includes('action') || g.includes('fast-paced') || g.includes('fps') || d.includes('adrenaline')) pacing += 0.35;
  if (g.includes('turn-based') || g.includes('strategy') || g.includes('simulation') || d.includes('methodical')) pacing -= 0.3;

  // 9. Session Scale
  let session = 0.5;
  if (g.includes('rpg') || g.includes('open world') || g.includes('mmo') || d.includes('massive')) session += 0.35;
  if (g.includes('roguelike') || g.includes('casual') || g.includes('arcade') || d.includes('quick run')) session -= 0.3;

  // 10. Replayability Variety
  let replay = 0.5;
  if (g.includes('roguelike') || d.includes('procedural') || d.includes('randomized') || d.includes('infinite replayability')) replay += 0.45;
  if (multiplayer > 0.6 || d.includes('build variety')) replay += 0.2;

  // 11. Art Immersion
  let art = 0.8;
  if (d.includes('stunning') || d.includes('cinematic') || d.includes('atmospheric') || d.includes('breathtaking')) art += 0.15;

  const clamp = (val: number) => Math.max(0.05, Math.min(0.98, Math.round(val * 100) / 100));

  return {
    combatDepth: clamp(combat),
    narrativeStory: clamp(story),
    explorationFreedom: clamp(exploration),
    challengeDifficulty: clamp(challenge),
    progressionCrafting: clamp(crafting),
    multiplayerSocial: clamp(multiplayer),
    horrorTension: clamp(horror),
    pacingFlow: clamp(pacing),
    sessionScale: clamp(session),
    replayabilityVariety: clamp(replay),
    artImmersion: clamp(art),
  };
}

/**
 * Imports any game from Steam's 100,000+ library and formats it into a full GameItem.
 */
export async function importSteamApp(appId: number): Promise<GameItem | null> {
  try {
    // 1. Fetch Store Details
    const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`;
    const res = await fetch(detailUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const app = data[appId]?.data;
    if (!app || app.type !== 'game') return null;

    // 2. Fetch Review Sentiment
    let reviewSentiment = 'Very Positive';
    let reviewPercentage = 88;
    let reviewCount = '10,000+';

    try {
      const reviewUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all`;
      const reviewRes = await fetch(reviewUrl);
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        if (reviewData.query_summary) {
          const total = reviewData.query_summary.total_reviews || 0;
          const pos = reviewData.query_summary.total_positive || 0;
          if (total > 0) {
            reviewPercentage = Math.round((pos / total) * 100);
            reviewCount = `${total.toLocaleString()}+`;
            reviewSentiment = reviewData.query_summary.review_score_desc || 'Positive';
          }
        }
      }
    } catch (e) {
      console.warn(`Could not load review score for AppID ${appId}:`, e);
    }

    // 3. Process Genres & Categories
    const genres = (app.genres || []).map((g: any) => g.description);
    const categories = (app.categories || []).map((c: any) => c.description);
    const descText = (app.short_description || app.detailed_description || '').replace(/<[^>]*>?/gm, '');

    const isSinglePlayer = categories.some((c: string) => c.toLowerCase().includes('single-player'));
    const isMultiplayer = categories.some((c: string) => c.toLowerCase().includes('multi-player') || c.toLowerCase().includes('mmo') || c.toLowerCase().includes('pvp'));
    const isCoop = categories.some((c: string) => c.toLowerCase().includes('co-op'));
    const isPvP = categories.some((c: string) => c.toLowerCase().includes('pvp'));

    // Difficulty detection
    let difficulty: GameDifficulty = 'Moderate';
    const lowerDesc = descText.toLowerCase();
    if (lowerDesc.includes('soulslike') || lowerDesc.includes('souls-like') || genres.some((g: string) => g.toLowerCase().includes('souls'))) {
      difficulty = 'Soulslike';
    } else if (lowerDesc.includes('punishing') || lowerDesc.includes('unforgiving') || lowerDesc.includes('hardcore') || genres.includes('Roguelike')) {
      difficulty = 'Challenging';
    } else if (genres.includes('Casual') || genres.includes('Simulation') || lowerDesc.includes('relaxing') || lowerDesc.includes('cozy')) {
      difficulty = 'Casual';
    }

    // Crafting & Grinding
    const hasCrafting = lowerDesc.includes('crafting') || lowerDesc.includes('craft ') || genres.includes('Survival');
    const hasJumpScares = genres.includes('Horror') || lowerDesc.includes('jump scare');
    const hasGrinding = lowerDesc.includes('grind') || lowerDesc.includes('farming mats');

    // Platforms
    const platforms: Platform[] = ['Windows'];
    if (app.platforms?.mac) platforms.push('Mac');
    if (app.platforms?.linux) platforms.push('Linux', 'Steam Deck');

    // Price
    let priceStr = 'Free to Play';
    let priceNum = 0;
    if (app.is_free) {
      priceStr = 'Free to Play';
      priceNum = 0;
    } else if (app.price_overview) {
      priceNum = app.price_overview.final / 100;
      priceStr = `$${priceNum.toFixed(2)}`;
    }

    // Release Year
    const releaseDateStr = app.release_date?.date || '2023';
    const yearMatch = releaseDateStr.match(/\b(19\d\d|20\d\d)\b/);
    const releaseYear = yearMatch ? parseInt(yearMatch[0], 10) : 2023;

    // Feature Vector
    const featureVector = synthesizeFeatureVector(genres, categories, descText, difficulty);

    // Playtime heuristics
    let mainPlaytime = 15;
    if (genres.includes('RPG') || genres.includes('Open World')) mainPlaytime = 45;
    else if (genres.includes('Roguelike')) mainPlaytime = 25;
    else if (genres.includes('Action') || genres.includes('Adventure')) mainPlaytime = 16;
    else if (genres.includes('Casual') || genres.includes('Puzzle')) mainPlaytime = 8;

    // Build unique ID
    const sanitizedTitle = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `steam-${appId}-${sanitizedTitle}`;

    // Screenshots extraction
    const screenshots: GameScreenshot[] = Array.isArray(app.screenshots)
      ? app.screenshots.map((s: any, idx: number) => ({
          id: s.id ?? idx,
          thumbnail: s.path_thumbnail || s.path_full,
          full: s.path_full,
        }))
      : [];

    // Metacritic Critic Rating
    const metacriticScore = typeof app.metacritic?.score === 'number' ? app.metacritic.score : undefined;

    // Rich Story Synopsis
    const storySynopsis = (app.detailed_description || app.about_the_game || app.short_description || descText)
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // PC Requirements
    const pcRequirements = {
      minimum: app.pc_requirements?.minimum
        ? app.pc_requirements.minimum.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
        : undefined,
      recommended: app.pc_requirements?.recommended
        ? app.pc_requirements.recommended.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
        : undefined,
    };

    const supportedLanguages = app.supported_languages
      ? app.supported_languages.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
      : undefined;

    const controllerSupport = app.controller_support === 'full'
      ? 'Full Controller Support'
      : app.controller_support === 'partial'
      ? 'Partial Controller Support'
      : 'Keyboard & Mouse';

    // Moods based on features
    const moods: string[] = [];
    if (featureVector.combatDepth > 0.6 || featureVector.pacingFlow > 0.6) moods.push('Adrenaline & Action');
    if (featureVector.challengeDifficulty < 0.4 && featureVector.horrorTension < 0.2) moods.push('Chill & Relaxing');
    if (featureVector.narrativeStory > 0.6) moods.push('Deep Story & Mystery');
    if (featureVector.challengeDifficulty > 0.7) moods.push('High Challenge');
    if (isCoop || isMultiplayer) moods.push('Co-op Chaos');
    if (moods.length === 0) moods.push('Adrenaline & Action');

    const gameItem: GameItem = {
      id,
      steamAppId: appId,
      title: app.name,
      tagline: app.short_description || `Experience ${app.name} on Steam.`,
      description: descText.slice(0, 450) + (descText.length > 450 ? '...' : ''),
      storySynopsis: storySynopsis.slice(0, 1500),
      screenshots,
      metacriticScore,
      pcRequirements,
      supportedLanguages,
      controllerSupport,
      genres: genres.length > 0 ? genres : ['Action'],
      tags: [...genres, ...categories.slice(0, 5)],
      moods,
      platforms,
      releaseDate: releaseDateStr,
      releaseYear,
      developer: (app.developers || ['Unknown Studio']).join(', '),
      publisher: (app.publishers || ['Unknown Publisher']).join(', '),
      mainStoryPlaytime: mainPlaytime,
      averagePlaytime: Math.round(mainPlaytime * 1.8),
      singlePlayer: isSinglePlayer,
      multiplayer: isMultiplayer,
      coopSupport: isCoop,
      pvpSupport: isPvP,
      difficulty,
      mechanics: categories.slice(0, 6),
      themes: genres.slice(0, 4),
      hasCrafting,
      hasJumpScares,
      hasGrinding,
      artStyle: 'Steam Store Artwork',
      bannerUrl: app.header_image || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
      posterUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
      capsuleUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`,
      price: priceStr,
      priceNum,
      reviewSentiment,
      reviewPercentage,
      reviewCount,
      steamUrl: `https://store.steampowered.com/app/${appId}/`,
      source: 'steam',
      metadataConfidence: 0.95,
      featureVector,
      pros: [
        `Steam user score: ${reviewPercentage}% (${reviewSentiment})`,
        `Developed by ${app.developers?.[0] || 'proven creators'}`,
        categories.slice(0, 2).join(' • ') || 'Engaging mechanics',
      ],
      cons: [
        difficulty === 'Soulslike' || difficulty === 'Challenging' ? 'Steep learning curve' : 'Requires dedicated time investment',
      ],
      similarTo: genres.slice(0, 2),
    };

    return gameItem;
  } catch (err) {
    console.error(`Error importing Steam AppID ${appId}:`, err);
    return null;
  }
}

/**
 * Pre-defined high-profile Steam bundles for 1-click batch import.
 */
export const STEAM_BATCH_PRESETS: {
  id: string;
  name: string;
  description: string;
  badge: string;
  appIds: number[];
}[] = [
  {
    id: 'top-played-global',
    name: 'Top 25 Most Played on Steam',
    description: 'The highest concurrent player titans across Steam right now.',
    badge: '🔥 Global Hits',
    appIds: [
      730,     // Counter-Strike 2
      570,     // Dota 2
      578080,  // PUBG
      1172470, // Apex Legends
      271590,  // GTA V
      1086940, // Baldur's Gate 3
      1623730, // Palworld
      553850,  // Helldivers 2
      2358720, // Black Myth: Wukong
      1091500, // Cyberpunk 2077
      252490,  // Rust
      359550,  // Rainbow Six Siege
      440,     // Team Fortress 2
      381210,  // Dead by Daylight
      230410,  // Warframe
      582010,  // Monster Hunter: World
      105600,  // Terraria
      413150,  // Stardew Valley
      550,     // Left 4 Dead 2
      1245620, // Elden Ring
      292030,  // The Witcher 3
      431960,  // Wallpaper Engine
      227300,  // Euro Truck Simulator 2
      218620,  // Payday 2
      1063730, // New World
    ],
  },
  {
    id: 'critically-acclaimed',
    name: 'Top 25 Masterpieces (95%+ Positive)',
    description: 'Overwhelmingly positive reviews from millions of Steam gamers.',
    badge: '⭐ 95%+ Steam Score',
    appIds: [
      620,     // Portal 2
      1145360, // Hades
      367520,  // Hollow Knight
      391540,  // Undertale
      504230,  // Celeste
      646570,  // Slay the Spire
      220,     // Half-Life 2
      294100,  // RimWorld
      427520,  // Factorio
      632470,  // Disco Elysium
      1593500, // God of War
      1174180, // Red Dead Redemption 2
      814380,  // Sekiro
      264710,  // Subnautica
      548430,  // Deep Rock Galactic
      588650,  // Dead Cells
      861540,  // Cyber Shadow / Katana ZERO
      632360,  // Risk of Rain 2
      1868140, // Dave the Diver
      2379780, // Balatro
      753640,  // Outer Wilds
      1057090, // Ori and the Will of the Wisps
      1092790, // Inscryption
      1794680, // Vampire Survivors
      250900,  // The Binding of Isaac: Rebirth
    ],
  },
  {
    id: 'trending-modern',
    name: 'Top 20 Modern Releases (2024-2026)',
    description: 'Breakout hits and recent sensations dominating player wishlists.',
    badge: '🚀 Modern Blockbusters',
    appIds: [
      2183900, // Warhammer 40,000: Space Marine 2
      526870,  // Satisfactory (1.0)
      1363080, // Manor Lords
      2161700, // Persona 3 Reload
      2054970, // Dragon's Dogma 2
      2358720, // Black Myth: Wukong
      1145350, // Hades II
      1627720, // Lies of P
      1282100, // Remnant II
      1888160, // Armored Core VI
      1203220, // Enshrouded
      2420110, // Horizon Forbidden West Complete
      1151640, // Horizon Zero Dawn
      1817070, // Marvel's Spider-Man Remastered
      1817190, // Marvel's Spider-Man: Miles Morales
      1778820, // Tekken 8
      275850,  // No Man's Sky (Omega / 5.0)
      1938090, // Call of Duty
      1446780, // Monster Hunter Rise
      2246340, // Dragon Ball: Sparking! ZERO
    ],
  },
  {
    id: 'cozy-relaxing-indies',
    name: 'Top 20 Cozy & Relaxing Indies',
    description: 'Low-stress, high-charm games perfect for unhurried evenings.',
    badge: '☕ Relax & Unwind',
    appIds: [
      413150,  // Stardew Valley
      1135690, // A Short Hike
      1338520, // Unpacking
      1243830, // Dorfromantik
      972660,  // Spiritfarer
      1057090, // Ori and the Will of the Wisps
      753640,  // Outer Wilds
      1868140, // Dave the Diver
      1062090, // Timberborn
      1041720, // Kingdom Two Crowns
      673880,  // Slime Rancher
      1657630, // Slime Rancher 2
      1284190, // Coral Island
      1426210, // It Takes Two
      1599340, // Lost in Random
      1498040, // Roots of Pacha
      1794680, // Vampire Survivors
      1084600, // My Time at Sandrock
      962130,  // Grounded
      1488200, // Cozy Grove
    ],
  },
];
