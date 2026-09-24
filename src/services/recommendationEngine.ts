import { CURATED_GAMES, ALL_AUTOMATIC_GAMES } from '../data/gamesCatalog';
import { GameFeatureVector, GameItem, ParsedUserIntent, RecommendationDebug } from '../types';

/**
 * Calculates cosine similarity between two 11-dimensional feature vectors.
 */
export function cosineSimilarity(a: GameFeatureVector, b: GameFeatureVector): number {
  const keys: (keyof GameFeatureVector)[] = [
    'combatDepth',
    'narrativeStory',
    'explorationFreedom',
    'challengeDifficulty',
    'progressionCrafting',
    'multiplayerSocial',
    'horrorTension',
    'pacingFlow',
    'sessionScale',
    'replayabilityVariety',
    'artImmersion',
  ];

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const k of keys) {
    const valA = a[k] ?? 0;
    const valB = b[k] ?? 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Robust, deterministic intent parser that extracts reference games,
 * hard constraints, soft preferences, and negative filters from natural language.
 */
export function parseNaturalLanguageIntent(query: string, options: {
  mood?: string;
  playStyle?: string;
  genres?: string[];
  maxPrice?: number;
  minReviewScore?: number;
  likedGames?: string[];
  hatedGames?: string[];
} = {}): ParsedUserIntent {
  const q = (query || '').toLowerCase().trim();
  const intent: ParsedUserIntent = {
    referenceGames: [],
    genres: [...(options.genres || [])],
    mechanics: [],
    themes: [],
    platforms: [],
    minPlaytime: null,
    maxPlaytime: null,
    singlePlayer: null,
    multiplayer: null,
    coop: null,
    pvp: null,
    difficulty: null,
    storyImportance: null,
    explorationImportance: null,
    crafting: null,
    horror: null,
    jumpScares: null,
    negativePreferences: [...(options.hatedGames || [])],
    maxPrice: options.maxPrice ?? null,
    similarityMode: false,
    summary: '',
  };

  // 1. Reference game detection
  const gameAliases: [string, string][] = [
    ['resident evil 4', 'Resident Evil 4 (Remake)'],
    ['resident evil', 'Resident Evil 4 (Remake)'],
    ['re4', 'Resident Evil 4 (Remake)'],
    ['elden ring', 'Elden Ring'],
    ['dark souls 3', 'Dark Souls III'],
    ['dark souls iii', 'Dark Souls III'],
    ['dark souls', 'Dark Souls III'],
    ['sekiro', 'Sekiro: Shadows Die Twice'],
    ['hollow knight', 'Hollow Knight'],
    ['dead space', 'Dead Space (Remake)'],
    ['signalis', 'SIGNALIS'],
    ['outer wilds', 'Outer Wilds'],
    ['disco elysium', 'Disco Elysium - The Final Cut'],
    ['cyberpunk 2077', 'Cyberpunk 2077'],
    ['cyberpunk', 'Cyberpunk 2077'],
    ['the witcher 3', 'The Witcher 3: Wild Hunt'],
    ['the witcher', 'The Witcher 3: Wild Hunt'],
    ['witcher 3', 'The Witcher 3: Wild Hunt'],
    ['witcher', 'The Witcher 3: Wild Hunt'],
    ['baldur\'s gate 3', 'Baldur\'s Gate 3'],
    ['baldurs gate 3', 'Baldur\'s Gate 3'],
    ['bg3', 'Baldur\'s Gate 3'],
    ['subnautica', 'Subnautica'],
    ['hades 2', 'Hades II'],
    ['hades ii', 'Hades II'],
    ['hades', 'Hades II'],
    ['balatro', 'Balatro'],
    ['slay the spire', 'Slay the Spire'],
    ['helldivers 2', 'Helldivers 2'],
    ['helldivers', 'Helldivers 2'],
    ['deep rock galactic', 'Deep Rock Galactic'],
    ['deep rock', 'Deep Rock Galactic'],
    ['drg', 'Deep Rock Galactic'],
    ['red dead redemption 2', 'Red Dead Redemption 2'],
    ['red dead 2', 'Red Dead Redemption 2'],
    ['rdr2', 'Red Dead Redemption 2'],
    ['grand theft auto v', 'Grand Theft Auto V'],
    ['grand theft auto 5', 'Grand Theft Auto V'],
    ['grand theft auto', 'Grand Theft Auto V'],
    ['gta 5', 'Grand Theft Auto V'],
    ['gta v', 'Grand Theft Auto V'],
    ['gta', 'Grand Theft Auto V'],
    ['celeste', 'Celeste'],
    ['stardew valley', 'Stardew Valley'],
    ['stardew', 'Stardew Valley'],
    ['it takes two', 'It Takes Two'],
    ['doom eternal', 'DOOM Eternal'],
    ['doom', 'DOOM Eternal'],
    ['factorio', 'Factorio'],
    ['counter-strike 2', 'Counter-Strike 2'],
    ['counter strike 2', 'Counter-Strike 2'],
    ['counter-strike', 'Counter-Strike 2'],
    ['counter strike', 'Counter-Strike 2'],
    ['cs2', 'Counter-Strike 2'],
    ['euro truck simulator 2', 'Euro Truck Simulator 2'],
    ['euro truck', 'Euro Truck Simulator 2'],
  ];

  for (const [alias, canonical] of gameAliases) {
    if (q.includes(alias)) {
      if (!intent.referenceGames.includes(canonical)) {
        intent.referenceGames.push(canonical);
      }
      intent.similarityMode = true;
      break; // match longest alias first
    }
  }

  // 2. Playtime hard constraints
  // "under 20 hours", "under 30 hours", "under 15 hrs", "< 20h"
  const underMatch = q.match(/(?:under|less than|<|below)\s*(\d+)\s*(?:hours|hour|hrs|hr|h\b)/);
  if (underMatch) {
    intent.maxPlaytime = parseInt(underMatch[1], 10);
  } else if (q.includes('finish this weekend') || q.includes('finish in one weekend') || q.includes('one weekend') || q.includes('this weekend')) {
    intent.maxPlaytime = 18;
  } else if (q.includes('short campaign') || q.includes('short game') || q.includes('quick game') || q.includes('bite-sized') || q.includes('shorter') || q.includes('more compact')) {
    intent.maxPlaytime = 25;
  }

  const overMatch = q.match(/(?:over|more than|>|at least)\s*(\d+)\s*(?:hours|hour|hrs|hr|h\b)/);
  if (overMatch) {
    intent.minPlaytime = parseInt(overMatch[1], 10);
  } else if (q.includes('100+ hr') || q.includes('epic sink') || q.includes('massive rpg')) {
    intent.minPlaytime = 60;
  }

  // 3. Crafting constraint
  if (
    q.includes('without crafting') ||
    q.includes('no crafting') ||
    q.includes('hate crafting') ||
    q.includes('avoid crafting') ||
    q.includes('don\'t want crafting') ||
    q.includes('dont want crafting') ||
    q.includes('do not want crafting') ||
    q.includes('not want crafting')
  ) {
    intent.crafting = false;
    intent.negativePreferences.push('crafting');
  } else if (q.includes('heavy crafting') || q.includes('base building and crafting')) {
    intent.crafting = true;
  }

  // 4. Single-player vs Multiplayer / PvP constraints
  if (
    q.includes('single-player') ||
    q.includes('single player') ||
    q.includes('solo') ||
    q.includes('offline') ||
    q.includes('just me')
  ) {
    intent.singlePlayer = true;
    intent.multiplayer = false;
  }

  if (
    q.includes('no pvp') ||
    q.includes('don\'t want pvp') ||
    q.includes('dont want pvp') ||
    q.includes('pve only') ||
    q.includes('no competitive') ||
    q.includes('non-competitive')
  ) {
    intent.pvp = false;
    intent.negativePreferences.push('pvp');
  }

  if (
    q.includes('competitive') ||
    q.includes('esports') ||
    q.includes('pvp') ||
    q.includes('ranked')
  ) {
    if (!q.includes('no pvp') && !q.includes('don\'t want pvp')) {
      intent.pvp = true;
      intent.multiplayer = true;
    }
  }

  if (q.includes('co-op') || q.includes('cooperative') || q.includes('with friends') || q.includes('squad')) {
    intent.coop = true;
    intent.multiplayer = true;
  }

  // 5. Difficulty constraints
  if (
    q.includes('not a soulslike') ||
    q.includes('not soulslike') ||
    q.includes('no souls-like') ||
    q.includes('no soulslike') ||
    q.includes('not souls like') ||
    q.includes('but not a soulslike')
  ) {
    intent.negativePreferences.push('soulslike');
    intent.difficulty = 'Challenging';
  } else if (q.includes('soulslike') || q.includes('souls-like')) {
    intent.difficulty = 'Soulslike';
  } else if (q.includes('relaxing') || q.includes('chill') || q.includes('cozy') || q.includes('zen') || q.includes('unwind')) {
    intent.difficulty = 'Casual';
    intent.negativePreferences.push('stress', 'punishing');
  } else if (q.includes('difficult') || q.includes('hard') || q.includes('challenging')) {
    intent.difficulty = 'Challenging';
  }

  // 6. Horror & Jump scare constraints
  if (
    q.includes('less scary') ||
    q.includes('not scary') ||
    q.includes('no horror') ||
    q.includes('hate horror') ||
    q.includes('no jump scares') ||
    q.includes('without jump scares') ||
    q.includes('no jumpscares')
  ) {
    intent.jumpScares = false;
    intent.horror = false;
    intent.negativePreferences.push('jump scares', 'extreme horror');
  } else if (q.includes('scary') || q.includes('horror') || q.includes('terrifying')) {
    intent.horror = true;
  }

  // 7. Grinding constraints
  if (
    q.includes('hate grinding') ||
    q.includes('no grinding') ||
    q.includes('without grinding') ||
    q.includes('no grind') ||
    q.includes('don\'t want to grind')
  ) {
    intent.negativePreferences.push('grinding');
  }

  // 8. Story importance
  if (q.includes('story-heavy') || q.includes('rich story') || q.includes('deep story') || q.includes('story rich') || q.includes('great narrative')) {
    intent.storyImportance = 'high';
  }

  // 9. Explicit Genre Extractions
  if (q.includes('shooter') || q.includes('fps')) {
    if (!intent.genres.includes('Shooter') && !intent.genres.includes('FPS')) {
      intent.genres.push('Shooter', 'FPS');
    }
  }
  if (q.includes('rpg') || q.includes('role playing') || q.includes('role-playing')) {
    if (!intent.genres.includes('RPG')) {
      intent.genres.push('RPG');
    }
  }
  if (q.includes('open world') || q.includes('open-world')) {
    if (!intent.genres.includes('Open World')) {
      intent.genres.push('Open World');
    }
  }
  if (q.includes('deckbuilder') || q.includes('card game')) {
    if (!intent.genres.includes('Deckbuilder')) {
      intent.genres.push('Deckbuilder');
    }
  }
  if (q.includes('platformer')) {
    if (!intent.genres.includes('Platformer')) {
      intent.genres.push('Platformer');
    }
  }

  // Build summary string
  const summaryParts: string[] = [];
  if (intent.referenceGames.length) summaryParts.push(`Similar to ${intent.referenceGames.join(', ')}`);
  if (intent.maxPlaytime) summaryParts.push(`Under ${intent.maxPlaytime} hours`);
  if (intent.crafting === false) summaryParts.push('Without crafting');
  if (intent.pvp === false) summaryParts.push('No PvP');
  if (intent.jumpScares === false) summaryParts.push('No jump scares / low terror');
  if (intent.singlePlayer) summaryParts.push('Single-player focus');
  if (intent.negativePreferences.includes('soulslike')) summaryParts.push('Difficult but NOT Soulslike');
  if (intent.negativePreferences.includes('grinding')) summaryParts.push('Zero repetitive grind');
  if (intent.genres.length) summaryParts.push(`Genres: ${intent.genres.join(', ')}`);

  intent.summary = summaryParts.length ? summaryParts.join(' • ') : 'Personalized recommendation request';

  return intent;
}

/**
 * Builds a target feature vector from user intent.
 */
function buildTargetFeatureVector(intent: ParsedUserIntent, referenceGame?: GameItem): GameFeatureVector {
  if (referenceGame) {
    const v = { ...referenceGame.featureVector };
    if (intent.maxPlaytime && intent.maxPlaytime <= 25) {
      v.sessionScale = Math.min(v.sessionScale, 0.40);
    }
    if (intent.crafting === false) {
      v.progressionCrafting = Math.min(v.progressionCrafting, 0.15);
    }
    if (intent.horror === false || intent.jumpScares === false) {
      v.horrorTension = Math.min(v.horrorTension, 0.25);
    }
    if (intent.singlePlayer === true) {
      v.multiplayerSocial = 0.0;
    }
    return v;
  }

  // Construct target vector based on explicit intent
  return {
    combatDepth: intent.genres.includes('Shooter') || intent.genres.includes('FPS') || intent.difficulty === 'Challenging' ? 0.92 : intent.difficulty === 'Casual' ? 0.10 : 0.60,
    narrativeStory: intent.storyImportance === 'high' ? 0.98 : intent.difficulty === 'Casual' ? 0.50 : 0.60,
    explorationFreedom: intent.genres.includes('Open World') ? 0.95 : 0.60,
    challengeDifficulty: intent.difficulty === 'Casual' ? 0.20 : intent.difficulty === 'Challenging' ? 0.90 : 0.55,
    progressionCrafting: intent.crafting === false ? 0.05 : intent.crafting === true ? 0.90 : 0.40,
    multiplayerSocial: intent.singlePlayer === true ? 0.0 : intent.multiplayer === true ? 0.95 : 0.25,
    horrorTension: intent.horror === false ? 0.05 : intent.horror === true ? 0.90 : 0.20,
    pacingFlow: intent.genres.includes('Shooter') ? 0.92 : 0.65,
    sessionScale: intent.maxPlaytime && intent.maxPlaytime <= 20 ? 0.25 : intent.maxPlaytime && intent.maxPlaytime <= 30 ? 0.40 : 0.60,
    replayabilityVariety: 0.80,
    artImmersion: 0.90,
  };
}

/**
 * Evaluates candidate game against hard constraints and computes calibrated hybrid score.
 */
export function evaluateGameMatch(
  game: GameItem,
  intent: ParsedUserIntent,
  options: {
    likedGames?: string[];
    hatedGames?: string[];
    userBacklog?: string[];
    referenceGameObj?: GameItem;
  } = {}
): {
  game: GameItem;
  overallScore: number;
  hardConstraintPassed: boolean;
  debug: RecommendationDebug;
  aiVerdict: string;
} {
  const { likedGames = [], hatedGames = [], userBacklog = [], referenceGameObj } = options;

  let hardConstraintPassed = true;
  let constraintSatisfaction = 1.0;
  const positiveMatches: string[] = [];
  const potentialMismatches: string[] = [];
  const missingData: string[] = [];

  // 0. SELF-RECOMMENDATION FILTER
  if (intent.referenceGames.some(ref => game.title.toLowerCase() === ref.toLowerCase() || game.id === ref.toLowerCase())) {
    return {
      game,
      overallScore: 0,
      hardConstraintPassed: false,
      debug: {
        overallScore: 0,
        semanticScore: 0,
        featureScore: 0,
        referenceScore: 0,
        tasteScore: 0,
        constraintSatisfaction: 0,
        negativePenalty: 0,
        confidence: 1.0,
        positiveMatches: [],
        potentialMismatches: ['Game is the exact reference title being queried against'],
        missingData: [],
      },
      aiVerdict: 'Reference title itself; excluded to provide fresh alternatives.',
    };
  }

  // 1. HARD CONSTRAINT: Max Playtime (STRICT)
  if (intent.maxPlaytime !== null) {
    const limit = intent.maxPlaytime;
    if (game.mainStoryPlaytime > limit) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push(`Campaign exceeds strict limit (${game.mainStoryPlaytime}h > ${limit}h)`);
    } else {
      positiveMatches.push(`Fits playtime target (${game.mainStoryPlaytime}h <= ${limit}h)`);
    }
  }

  // 2. HARD CONSTRAINT: Min Playtime
  if (intent.minPlaytime !== null) {
    if (game.averagePlaytime < intent.minPlaytime) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push(`Campaign too short (${game.averagePlaytime}h < ${intent.minPlaytime}h)`);
    }
  }

  // 3. HARD CONSTRAINT: Crafting
  if (intent.crafting === false) {
    if (game.hasCrafting) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Contains crafting systems which were explicitly excluded');
    } else {
      positiveMatches.push('Zero crafting mechanics');
    }
  }

  // 4. HARD CONSTRAINT: Singleplayer only
  if (intent.singlePlayer === true) {
    if (!game.singlePlayer) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Requires multiplayer/co-op; no solo campaign');
    } else {
      positiveMatches.push('Dedicated single-player experience');
    }
  }

  // 4b. HARD CONSTRAINT: Multiplayer required
  if (intent.multiplayer === true) {
    if (!game.multiplayer) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Singleplayer only; lacks multiplayer support');
    } else {
      positiveMatches.push('Supports multiplayer gameplay');
    }
  }

  // 5. HARD CONSTRAINT: No PvP
  if (intent.pvp === false) {
    if (game.pvpSupport && !game.singlePlayer && !game.coopSupport) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Strictly competitive PvP');
    } else if (!game.pvpSupport) {
      positiveMatches.push('Non-competitive / PvE focus');
    }
  }

  // 6. HARD CONSTRAINT: Not Soulslike
  if (intent.negativePreferences.includes('soulslike')) {
    if (game.difficulty === 'Soulslike' || game.tags.some(t => t.toLowerCase().includes('souls-like'))) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Soulslike title explicitly excluded');
    }
  }

  // 7. HARD CONSTRAINT: Jump scares
  if (intent.jumpScares === false) {
    if (game.hasJumpScares) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Contains sudden jump scares');
    }
  }

  // 8. HARD CONSTRAINT: No Grinding
  if (intent.negativePreferences.includes('grinding')) {
    if (game.hasGrinding) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Involves repetitive material/level grinding');
    }
  }

  // 9. HARD CONSTRAINT: Difficult query requirement
  if (intent.difficulty === 'Challenging' && !intent.negativePreferences.includes('soulslike') && intent.referenceGames.length === 0) {
    if (game.featureVector.challengeDifficulty < 0.75) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Does not meet high challenge requirement');
    }
  }

  // If "something difficult but not a soulslike": must be non-soulslike AND challengeDifficulty >= 0.75
  if (intent.negativePreferences.includes('soulslike') && intent.difficulty === 'Challenging') {
    if (game.featureVector.challengeDifficulty < 0.75) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('Does not meet high challenge requirement');
    }
  }

  // 10. HARD CONSTRAINT: Relaxing query requirement
  if (intent.difficulty === 'Casual' && (intent.summary.toLowerCase().includes('relaxing') || intent.summary.toLowerCase().includes('chill'))) {
    if (game.featureVector.challengeDifficulty > 0.55 || game.featureVector.horrorTension > 0.40) {
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push('High stress or combat challenge conflicts with relaxing preference');
    }
  }

  // 11. HARD CONSTRAINT: Genre demand (e.g. "shooter", "rpg")
  if (intent.genres.length > 0) {
    const hasGenre = intent.genres.some(ig =>
      game.genres.some(g => g.toLowerCase() === ig.toLowerCase()) ||
      game.tags.some(t => t.toLowerCase() === ig.toLowerCase())
    );
    if (!hasGenre) {
      // If user specifically searched for a genre like "shooter", don't recommend a game with no shooter elements!
      hardConstraintPassed = false;
      constraintSatisfaction = 0;
      potentialMismatches.push(`Missing required genre: ${intent.genres.join(' / ')}`);
    }
  }

  // 12. Negative games list
  if (hatedGames.some(hg => hg.toLowerCase() === game.title.toLowerCase() || hg.toLowerCase() === game.id)) {
    hardConstraintPassed = false;
    constraintSatisfaction = 0;
    potentialMismatches.push('Marked as disliked by user');
  }

  if (!hardConstraintPassed) {
    return {
      game,
      overallScore: 0,
      hardConstraintPassed: false,
      debug: {
        overallScore: 0,
        semanticScore: 0,
        featureScore: 0,
        referenceScore: 0,
        tasteScore: 0,
        constraintSatisfaction: 0,
        negativePenalty: 0,
        confidence: game.metadataConfidence,
        positiveMatches,
        potentialMismatches,
        missingData,
      },
      aiVerdict: `Filtered out: ${potentialMismatches.join('; ')}.`,
    };
  }

  // ================= SCORING COMPONENTS =================
  // A. Semantic score
  let semanticMatches = 0;
  let semanticTotal = Math.max(1, intent.genres.length);

  if (intent.genres.length > 0) {
    const overlap = game.genres.filter(g => intent.genres.some(ig => ig.toLowerCase() === g.toLowerCase()));
    semanticMatches += overlap.length;
    if (overlap.length > 0) {
      positiveMatches.push(`Genres: ${overlap.join(', ')}`);
    }
  }

  const semanticScore = (semanticMatches / semanticTotal) * 100;

  // B. Feature Vector Cosine Similarity (11-D)
  const targetVector = buildTargetFeatureVector(intent, referenceGameObj);
  const vectorSim = cosineSimilarity(game.featureVector, targetVector);
  const featureScore = Math.max(0, Math.min(100, Math.round(vectorSim * 100)));

  // C. Reference Game Alignment
  let referenceScore = 75;
  if (referenceGameObj) {
    const refSim = cosineSimilarity(game.featureVector, referenceGameObj.featureVector);
    const sharedTags = game.tags.filter(t => referenceGameObj.tags.includes(t));
    const sameDeveloper = game.developer === referenceGameObj.developer;
    referenceScore = Math.round(refSim * 65 + (Math.min(sharedTags.length, 3) / 3) * 25 + (sameDeveloper ? 10 : 0));
    if (sharedTags.length > 0) {
      positiveMatches.push(`Shared DNA with ${referenceGameObj.title}: ${sharedTags.slice(0, 3).join(', ')}`);
    }
    if (sameDeveloper) {
      positiveMatches.push(`Same developer pedigree (${game.developer})`);
    }
  }

  // D. Taste & Backlog score
  let tasteScore = 80;
  if (likedGames.length > 0) {
    const simToLiked = game.similarTo.filter(s => likedGames.some(lg => lg.toLowerCase() === s.toLowerCase()));
    if (simToLiked.length > 0) {
      tasteScore = 95;
      positiveMatches.push(`Similar to title you enjoyed: ${simToLiked.join(', ')}`);
    }
  }

  // Negative Penalty
  let negativePenalty = 0;
  for (const neg of intent.negativePreferences) {
    if (game.tags.some(t => t.toLowerCase().includes(neg.toLowerCase()))) {
      negativePenalty += 15;
    }
  }

  // If user requested single player and game is primarily multiplayer co-op, apply social penalty
  if (intent.singlePlayer === true && game.featureVector.multiplayerSocial > 0.8) {
    negativePenalty += 20;
  }

  // Quality bonus
  const qualityScore = (game.reviewPercentage / 100) * 8;

  // Final Calibration (Weighted Hybrid Formula)
  let rawScore: number;
  if (referenceGameObj) {
    rawScore = (referenceScore * 0.45) + (featureScore * 0.30) + (tasteScore * 0.15) + (semanticScore * 0.10) + qualityScore - negativePenalty;
  } else {
    rawScore = (featureScore * 0.50) + (semanticScore * 0.25) + (tasteScore * 0.15) + qualityScore - negativePenalty;
  }

  // Calibrate score realistically between 60% and 95%
  const calibratedScore = Math.round(Math.max(60, Math.min(95, rawScore)));

  // AI Verdict
  let aiVerdict = '';
  if (referenceGameObj) {
    const leadPro = game.pros[0] || game.tagline;
    aiVerdict = `Top match for fans of ${referenceGameObj.title}. Balances similar atmospheric immersion and mechanical precision while fitting within your criteria (~${game.mainStoryPlaytime}h). ${leadPro}.`;
  } else {
    aiVerdict = `${game.tagline} Aligns directly with your request for ${intent.summary}. Steam community rating is ${game.reviewPercentage}% positive across ${game.reviewCount} reviews.`;
  }

  return {
    game,
    overallScore: calibratedScore,
    hardConstraintPassed: true,
    debug: {
      overallScore: calibratedScore,
      semanticScore: Math.round(semanticScore),
      featureScore,
      referenceScore,
      tasteScore,
      constraintSatisfaction: 100,
      negativePenalty,
      confidence: game.metadataConfidence,
      positiveMatches,
      potentialMismatches,
      missingData,
    },
    aiVerdict,
  };
}

/**
 * Main recommendation pipeline: parses intent, strictly filters candidates,
 * ranks remaining games by hybrid score, and formats responses.
 */
export function getRecommendations(
  queryOrIntent: string | ParsedUserIntent,
  options: {
    mood?: string;
    playStyle?: string;
    genres?: string[];
    maxPrice?: number;
    minReviewScore?: number;
    likedGames?: string[];
    hatedGames?: string[];
    limit?: number;
    catalog?: GameItem[];
  } = {}
): {
  intent: ParsedUserIntent;
  recommendations: (GameItem & { matchScore: number; aiVerdict: string; debugBreakdown: RecommendationDebug })[];
  filteredCount: number;
} {
  const intent: ParsedUserIntent = typeof queryOrIntent === 'string'
    ? parseNaturalLanguageIntent(queryOrIntent, options)
    : queryOrIntent;
  const limit = options.limit || 6;
  const gamesPool = options.catalog && options.catalog.length > 0 ? options.catalog : ALL_AUTOMATIC_GAMES;

  let referenceGameObj: GameItem | undefined;
  const refGames = Array.isArray(intent?.referenceGames) ? intent.referenceGames : [];
  if (refGames.length > 0) {
    referenceGameObj = gamesPool.find(g =>
      refGames.some(ref => g.title.toLowerCase() === ref.toLowerCase() || g.id === ref.toLowerCase())
    );
  }

  const evaluations = gamesPool.map(game =>
    evaluateGameMatch(game, intent, {
      likedGames: options.likedGames,
      hatedGames: options.hatedGames,
      referenceGameObj,
    })
  );

  const validEvaluations = evaluations.filter(e => e.hardConstraintPassed && e.overallScore > 30);
  const filteredCount = evaluations.length - validEvaluations.length;

  validEvaluations.sort((a, b) => b.overallScore - a.overallScore);

  const top = validEvaluations.slice(0, limit).map(e => ({
    ...e.game,
    matchScore: e.overallScore,
    aiVerdict: e.aiVerdict,
    debugBreakdown: e.debug,
  }));

  return {
    intent,
    recommendations: top,
    filteredCount,
  };
}
