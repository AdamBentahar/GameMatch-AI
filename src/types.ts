export interface GameFeatureVector {
  combatDepth: number;          // 0.0 (none) to 1.0 (deep dexterity / tactical)
  narrativeStory: number;       // 0.0 (minimal) to 1.0 (branching cinematic lore)
  explorationFreedom: number;   // 0.0 (linear corridors) to 1.0 (limitless open world)
  challengeDifficulty: number;  // 0.0 (zen/cozy) to 1.0 (unforgiving/punishing)
  progressionCrafting: number;  // 0.0 (pure skill) to 1.0 (heavy crafting/loot tiers)
  multiplayerSocial: number;    // 0.0 (solo only) to 1.0 (team required/online)
  horrorTension: number;        // 0.0 (lighthearted) to 1.0 (dread & jump scares)
  pacingFlow: number;           // 0.0 (turn-based/methodical) to 1.0 (high APM adrenaline)
  sessionScale: number;         // 0.0 (15-min runs) to 1.0 (100h epic campaign)
  replayabilityVariety: number; // 0.0 (one-and-done) to 1.0 (infinite procedural builds)
  artImmersion: number;         // 0.0 (abstract/simple) to 1.0 (breathtaking visual immersion)
}

export type Platform = 'Windows' | 'Mac' | 'Linux' | 'Steam Deck' | 'PlayStation 5' | 'Xbox Series X/S' | 'Switch';
export type GameDifficulty = 'Casual' | 'Moderate' | 'Challenging' | 'Soulslike';

export interface GameScreenshot {
  id: number;
  thumbnail: string;
  full: string;
  caption?: string;
}

export interface GameItem {
  id: string;
  steamAppId: number;
  title: string;
  tagline: string;
  description: string;
  storySynopsis?: string;       // Rich story, lore premise, and world setting
  storySetting?: string;        // Setting description (e.g. Lands Between, Night City)
  screenshots?: GameScreenshot[]; // Real Steam HD screenshots
  metacriticScore?: number;     // Metacritic score if available (0-100)
  pcRequirements?: { minimum?: string; recommended?: string };
  supportedLanguages?: string;
  controllerSupport?: string;
  genres: string[];
  tags: string[];
  moods: string[];
  platforms: Platform[];
  releaseDate: string;
  releaseYear: number;
  developer: string;
  publisher: string;
  mainStoryPlaytime: number;    // Hours to beat main storyline
  averagePlaytime: number;      // Hours for main + extras
  singlePlayer: boolean;
  multiplayer: boolean;
  coopSupport: boolean;
  pvpSupport: boolean;
  difficulty: GameDifficulty;
  mechanics: string[];
  themes: string[];
  hasCrafting: boolean;
  hasJumpScares: boolean;
  hasGrinding: boolean;
  artStyle: string;
  bannerUrl: string;            // Real Steam CDN header URL
  posterUrl: string;            // Real Steam CDN vertical poster (600x900)
  capsuleUrl: string;           // Real Steam CDN capsule (616x353)
  price: string;
  priceNum: number;
  reviewSentiment: string;
  reviewPercentage: number;
  reviewCount: string;
  steamUrl: string;
  source: 'steam';
  metadataConfidence: number;   // 0.0 to 1.0
  featureVector: GameFeatureVector;
  pros: string[];
  cons: string[];
  similarTo: string[];
  matchScore?: number;
  aiVerdict?: string;
  debugBreakdown?: RecommendationDebug;
}

export interface RecommendationDebug {
  overallScore: number;
  semanticScore: number;
  featureScore: number;
  referenceScore: number;
  tasteScore: number;
  constraintSatisfaction: number;
  negativePenalty: number;
  confidence: number;
  positiveMatches: string[];
  potentialMismatches: string[];
  missingData: string[];
}

export interface ParsedUserIntent {
  referenceGames: string[];
  genres: string[];
  mechanics: string[];
  themes: string[];
  platforms: string[];
  minPlaytime: number | null;
  maxPlaytime: number | null;
  singlePlayer: boolean | null;
  multiplayer: boolean | null;
  coop: boolean | null;
  pvp: boolean | null;
  difficulty: GameDifficulty | 'Soulslike' | null;
  storyImportance: 'high' | 'medium' | 'low' | null;
  explorationImportance: 'high' | 'medium' | 'low' | null;
  crafting: boolean | null;
  horror: boolean | null;
  jumpScares: boolean | null;
  negativePreferences: string[];
  maxPrice: number | null;
  similarityMode: boolean;
  summary: string;
}

export interface BacklogItem {
  game: GameItem;
  status: 'want-to-play' | 'playing' | 'completed' | 'dropped';
  rating?: number; // 1 to 5
  userNote?: string;
  addedAt: string;
}

export interface TeammateBeacon {
  id: string;
  gameId: string;
  gameTitle: string;
  creatorName: string;
  creatorAvatar: string;
  creatorRank: string;
  gamerPersona: string;
  title: string;
  description: string;
  playStyle: 'Casual' | 'Competitive' | 'Lore / Story' | 'Hardcore';
  micRequired: boolean;
  slotsCurrent: number;
  slotsMax: number;
  region: string;
  language: string;
  createdAt: string;
  tags: string[];
}

export interface GamerDna {
  persona: string;
  badge: string;
  description: string;
  topGenres: string[];
  playStyleArchetype: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  role?: 'user' | 'assistant';
  content: string;
  timestamp: string;
  activeIntent?: Partial<ParsedUserIntent>;
  recommendedGames?: GameItem[];
  comparedGames?: GameItem[];
  factualGrounding?: string[];
}

export interface EvaluationResult {
  queryId: string;
  queryText: string;
  extractedIntent: Partial<ParsedUserIntent>;
  hardConstraintsPassed: boolean;
  negativePreferencesPassed: boolean;
  topRecommendations: {
    title: string;
    score: number;
    playtime: number;
    matchesCriteria: boolean;
    reason: string;
  }[];
  verdict: 'PASS' | 'FAIL';
  notes: string;
}
