import { CURATED_GAMES } from '../data/gamesCatalog';
import { GameItem, ParsedUserIntent, ChatMessage } from '../types';
import { getRecommendations, parseNaturalLanguageIntent } from './recommendationEngine';
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CompanionResponse {
  reply: string;
  activeIntent: ParsedUserIntent;
  recommendedGames: GameItem[];
  comparedGames: GameItem[];
  factualGrounding: string[];
}

/**
 * Searches the catalog for mentioned game titles.
 */
function findGamesInText(text: string): GameItem[] {
  const t = text.toLowerCase();
  const matched: GameItem[] = [];

  for (const game of CURATED_GAMES) {
    const titleLower = game.title.toLowerCase();
    const idLower = game.id.toLowerCase();
    if (t.includes(titleLower) || t.includes(idLower)) {
      matched.push(game);
      continue;
    }
    // Check known abbreviations
    if (titleLower.includes('resident evil 4') && (t.includes('re4') || t.includes('resident evil 4'))) {
      if (!matched.includes(game)) matched.push(game);
    } else if (titleLower.includes('baldur\'s gate 3') && (t.includes('bg3') || t.includes('baldurs gate'))) {
      if (!matched.includes(game)) matched.push(game);
    } else if (titleLower.includes('red dead redemption 2') && (t.includes('rdr2') || t.includes('red dead 2'))) {
      if (!matched.includes(game)) matched.push(game);
    } else if (titleLower.includes('grand theft auto v') && (t.includes('gta 5') || t.includes('gta v') || t.includes('gta'))) {
      if (!matched.includes(game)) matched.push(game);
    } else if (titleLower.includes('counter-strike 2') && (t.includes('cs2') || t.includes('counter strike'))) {
      if (!matched.includes(game)) matched.push(game);
    } else if (titleLower.includes('dark souls iii') && (t.includes('dark souls 3') || t.includes('dark souls iii'))) {
      if (!matched.includes(game)) matched.push(game);
    }
  }

  return matched;
}

/**
 * Merges previous conversation intent with new turn input.
 */
export function mergeConversationIntent(
  previousIntent: Partial<ParsedUserIntent> | undefined,
  currentQuery: string
): ParsedUserIntent {
  const current = parseNaturalLanguageIntent(currentQuery);

  if (!previousIntent) {
    return current;
  }

  const merged: ParsedUserIntent = {
    referenceGames: current.referenceGames.length ? current.referenceGames : (previousIntent.referenceGames || []),
    genres: Array.from(new Set([...(previousIntent.genres || []), ...current.genres])),
    mechanics: Array.from(new Set([...(previousIntent.mechanics || []), ...current.mechanics])),
    themes: Array.from(new Set([...(previousIntent.themes || []), ...current.themes])),
    platforms: Array.from(new Set([...(previousIntent.platforms || []), ...current.platforms])),
    minPlaytime: current.minPlaytime ?? previousIntent.minPlaytime ?? null,
    maxPlaytime: current.maxPlaytime ?? previousIntent.maxPlaytime ?? null,
    singlePlayer: current.singlePlayer ?? previousIntent.singlePlayer ?? null,
    multiplayer: current.multiplayer ?? previousIntent.multiplayer ?? null,
    coop: current.coop ?? previousIntent.coop ?? null,
    pvp: current.pvp ?? previousIntent.pvp ?? null,
    difficulty: current.difficulty ?? previousIntent.difficulty ?? null,
    storyImportance: current.storyImportance ?? previousIntent.storyImportance ?? null,
    explorationImportance: current.explorationImportance ?? previousIntent.explorationImportance ?? null,
    crafting: current.crafting !== null ? current.crafting : (previousIntent.crafting ?? null),
    horror: current.horror !== null ? current.horror : (previousIntent.horror ?? null),
    jumpScares: current.jumpScares !== null ? current.jumpScares : (previousIntent.jumpScares ?? null),
    negativePreferences: Array.from(new Set([...(previousIntent.negativePreferences || []), ...current.negativePreferences])),
    maxPrice: current.maxPrice ?? previousIntent.maxPrice ?? null,
    similarityMode: current.similarityMode || (previousIntent.similarityMode ?? false),
    summary: '',
  };

  // Rebuild summary
  const summaryParts: string[] = [];
  if (merged.referenceGames.length) summaryParts.push(`Similar to ${merged.referenceGames.join(', ')}`);
  if (merged.maxPlaytime) summaryParts.push(`Under ${merged.maxPlaytime}h`);
  if (merged.crafting === false) summaryParts.push('No crafting');
  if (merged.pvp === false) summaryParts.push('No PvP');
  if (merged.jumpScares === false) summaryParts.push('No jump scares');
  if (merged.singlePlayer) summaryParts.push('Single-player');
  if (merged.negativePreferences.includes('soulslike')) summaryParts.push('Difficult but not Soulslike');
  if (merged.negativePreferences.includes('grinding')) summaryParts.push('Zero grinding');

  merged.summary = summaryParts.length ? summaryParts.join(' • ') : 'Personalized recommendation request';

  return merged;
}

/**
 * Handles conversational inquiries, comparisons, factual Q&A, and follow-ups.
 */
export async function processCompanionQuery(
  userQuery: string,
  history: ChatMessage[] = [],
  activeIntent?: Partial<ParsedUserIntent>
): Promise<CompanionResponse> {
  const queryLower = userQuery.toLowerCase().trim();
  const mentionedGames = findGamesInText(userQuery);

  // 1. COMPARISON CHECK
  const isComparison = (
    queryLower.includes('difference between') ||
    queryLower.includes('compare') ||
    queryLower.includes('versus') ||
    queryLower.includes(' vs ') ||
    (mentionedGames.length >= 2 && (queryLower.includes('or') || queryLower.includes('which should i')))
  );

  if (isComparison && mentionedGames.length >= 2) {
    const gameA = mentionedGames[0];
    const gameB = mentionedGames[1];

    const grounding = [
      `${gameA.title}: Main Story ${gameA.mainStoryPlaytime}h (Avg ${gameA.averagePlaytime}h), Difficulty: ${gameA.difficulty}, Singleplayer: ${gameA.singlePlayer}, Co-op: ${gameA.coopSupport}, PvP: ${gameA.pvpSupport}, Crafting: ${gameA.hasCrafting}, Reviews: ${gameA.reviewPercentage}% (${gameA.reviewCount})`,
      `${gameB.title}: Main Story ${gameB.mainStoryPlaytime}h (Avg ${gameB.averagePlaytime}h), Difficulty: ${gameB.difficulty}, Singleplayer: ${gameB.singlePlayer}, Co-op: ${gameB.coopSupport}, PvP: ${gameB.pvpSupport}, Crafting: ${gameB.hasCrafting}, Reviews: ${gameB.reviewPercentage}% (${gameB.reviewCount})`,
    ];

    let reply = `### Comparing **${gameA.title}** vs **${gameB.title}**\n\n`;
    reply += `| Dimension | ${gameA.title} | ${gameB.title} |\n`;
    reply += `| :--- | :--- | :--- |\n`;
    reply += `| **Main Story Length** | ~${gameA.mainStoryPlaytime} hours | ~${gameB.mainStoryPlaytime} hours |\n`;
    reply += `| **Average Total Time** | ~${gameA.averagePlaytime} hours | ~${gameB.averagePlaytime} hours |\n`;
    reply += `| **Difficulty** | ${gameA.difficulty} | ${gameB.difficulty} |\n`;
    reply += `| **Single-player** | ${gameA.singlePlayer ? 'Yes (Full Solo Campaign)' : 'No (Co-op/Multi Only)'} | ${gameB.singlePlayer ? 'Yes (Full Solo Campaign)' : 'No (Co-op/Multi Only)'} |\n`;
    reply += `| **Multiplayer / Co-op** | ${gameA.coopSupport ? 'Co-op Supported' : gameA.pvpSupport ? 'PvP Supported' : 'Singleplayer Only'} | ${gameB.coopSupport ? 'Co-op Supported' : gameB.pvpSupport ? 'PvP Supported' : 'Singleplayer Only'} |\n`;
    reply += `| **Crafting Systems** | ${gameA.hasCrafting ? 'Yes (Material harvesting & upgrades)' : 'No (Pure skill & found loot)'} | ${gameB.hasCrafting ? 'Yes (Material harvesting & upgrades)' : 'No (Pure skill & found loot)'} |\n`;
    reply += `| **Steam User Score** | ${gameA.reviewPercentage}% Positive (${gameA.reviewCount}) | ${gameB.reviewPercentage}% Positive (${gameB.reviewCount}) |\n\n`;

    reply += `**Key Distinctions:**\n`;
    reply += `- **${gameA.title}** focuses on ${gameA.genres.join(', ')} with signature mechanics like ${gameA.mechanics.slice(0, 3).join(', ')}. ${gameA.pros[0]}.\n`;
    reply += `- **${gameB.title}** leans toward ${gameB.genres.join(', ')} emphasizing ${gameB.mechanics.slice(0, 3).join(', ')}. ${gameB.pros[0]}.\n\n`;
    reply += `**Recommendation:** If you want a ${gameA.mainStoryPlaytime < gameB.mainStoryPlaytime ? 'shorter, more focused' : 'vast, deep'} experience, pick **${gameA.title}**. If you prefer ${gameB.singlePlayer && !gameB.hasCrafting ? 'zero crafting and pure combat' : 'rich narrative choices'}, choose **${gameB.title}**.`;

    return {
      reply,
      activeIntent: parseNaturalLanguageIntent(userQuery),
      recommendedGames: [],
      comparedGames: [gameA, gameB],
      factualGrounding: grounding,
    };
  }

  // 2. FACTUAL QUESTIONS ABOUT SPECIFIC GAMES
  if (mentionedGames.length === 1) {
    const game = mentionedGames[0];

    // Factual: How long does X take?
    if (queryLower.includes('how long') || queryLower.includes('length') || queryLower.includes('hours to beat')) {
      const reply = `**${game.title} Playtime Breakdown:**\n\n- **Main Story Campaign:** Approximately **${game.mainStoryPlaytime} hours** to beat.\n- **Main + Side Content:** Approximately **${game.averagePlaytime} hours** for a thorough playthrough.\n- **Steam Rating:** ${game.reviewPercentage}% (${game.reviewSentiment} based on ${game.reviewCount} reviews).\n\n*Note: Playtime estimates are grounded in aggregated community completion data.*`;
      return {
        reply,
        activeIntent: parseNaturalLanguageIntent(userQuery),
        recommendedGames: [game],
        comparedGames: [],
        factualGrounding: [`${game.title}: mainStoryPlaytime=${game.mainStoryPlaytime}h, averagePlaytime=${game.averagePlaytime}h`],
      };
    }

    // Factual: Does X have PvP or Co-op?
    if (queryLower.includes('pvp') || queryLower.includes('co-op') || queryLower.includes('coop') || queryLower.includes('multiplayer')) {
      let statusDesc = '';
      if (game.coopSupport && game.pvpSupport) {
        statusDesc = `supports both online **Co-op** and competitive **PvP**.`;
      } else if (game.coopSupport) {
        statusDesc = `features dedicated **Co-op PvE**, but has **no competitive PvP**.`;
      } else if (game.pvpSupport) {
        statusDesc = `is focused on competitive **PvP**, with no campaign co-op.`;
      } else {
        statusDesc = `is strictly a **single-player experience** with no multiplayer or PvP features.`;
      }

      const reply = `**${game.title} Multiplayer Details:**\n\n${game.title} ${statusDesc}\n\n- **Single Player Support:** ${game.singlePlayer ? 'Yes' : 'No'}\n- **Co-op Support:** ${game.coopSupport ? 'Yes' : 'No'}\n- **PvP Support:** ${game.pvpSupport ? 'Yes' : 'No'}\n- **Platforms:** ${game.platforms.join(', ')}`;
      return {
        reply,
        activeIntent: parseNaturalLanguageIntent(userQuery),
        recommendedGames: [game],
        comparedGames: [],
        factualGrounding: [`${game.title}: singlePlayer=${game.singlePlayer}, coopSupport=${game.coopSupport}, pvpSupport=${game.pvpSupport}`],
      };
    }

    // Factual: Can I play X alone?
    if (queryLower.includes('alone') || queryLower.includes('solo') || queryLower.includes('single player') || queryLower.includes('singleplayer')) {
      let soloAnswer = '';
      if (!game.singlePlayer) {
        soloAnswer = `**No**, **${game.title}** is strictly built as a 2-player cooperative experience and **cannot be played solo**. You need a co-op partner (online or local split-screen via the free Friend's Pass).`;
      } else if (game.singlePlayer && !game.multiplayer) {
        soloAnswer = `**Yes**, **${game.title}** is a 100% focused solo single-player title designed specifically for lone explorers.`;
      } else {
        soloAnswer = `**Yes**, you can play **${game.title}** alone in single-player, but it also provides optional online multiplayer features.`;
      }

      return {
        reply: soloAnswer,
        activeIntent: parseNaturalLanguageIntent(userQuery),
        recommendedGames: [game],
        comparedGames: [],
        factualGrounding: [`${game.title}: singlePlayer=${game.singlePlayer}, multiplayer=${game.multiplayer}`],
      };
    }

    // Factual: What platforms is X on?
    if (queryLower.includes('platform') || queryLower.includes('available on') || queryLower.includes('steam deck') || queryLower.includes('console')) {
      const reply = `**${game.title} Platform Availability:**\n\n${game.title} is available on:\n${game.platforms.map(p => `- **${p}**`).join('\n')}\n\n- **Developer:** ${game.developer}\n- **Steam Store:** [Open Steam Page](${game.steamUrl})`;
      return {
        reply,
        activeIntent: parseNaturalLanguageIntent(userQuery),
        recommendedGames: [game],
        comparedGames: [],
        factualGrounding: [`${game.title}: platforms=[${game.platforms.join(', ')}]`],
      };
    }
  }

  // 3. RECOMMENDATION QUERY (with session history accumulation)
  const updatedIntent = mergeConversationIntent(activeIntent, userQuery);
  const recResult = getRecommendations(updatedIntent, {
    likedGames: [],
    hatedGames: updatedIntent.negativePreferences,
    limit: 4,
  });

  // If Gemini client is available, produce rich, factually grounded natural language response
  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const candidatesFactualSummary = recResult.recommendations.map(g =>
        `- ${g.title}: ~${g.mainStoryPlaytime}h campaign, ${g.genres.join('/')}, Difficulty: ${g.difficulty}, Crafting: ${g.hasCrafting}, Review: ${g.reviewPercentage}% positive. Verdict: ${g.aiVerdict}`
      ).join('\n');

      const systemPrompt = `
You are GameMatch AI Companion, a knowledgeable, truthful game advisor.
The user asked: "${userQuery}"
Current Conversational Intent Filters: ${updatedIntent.summary}
Candidate Games Retrieved from Database:
${candidatesFactualSummary}

Rules:
1. Ground your answer strictly in the candidate games provided above.
2. Address the user's specific constraints (e.g. playtime, crafting, difficulty) explicitly.
3. Be concise, direct, and helpful. Do not hallucinate playtimes or mechanics that contradict the data.
4. If a constraint eliminated games (e.g. "shorter" or "no crafting"), explain what was filtered out and why the remaining games fit.
      `;

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const apiPromise = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: systemPrompt,
      });

      const response: any = await Promise.race([apiPromise, timeoutPromise]);

      const aiText = response?.text?.trim();
      if (aiText) {
        return {
          reply: aiText,
          activeIntent: updatedIntent,
          recommendedGames: recResult.recommendations,
          comparedGames: [],
          factualGrounding: recResult.recommendations.map(g => `${g.title}: ${g.mainStoryPlaytime}h, crafting=${g.hasCrafting}`),
        };
      }
    } catch (e) {
      console.warn('Gemini companion query timed out or failed, using deterministic synthesis:', e);
    }
  }

  // Deterministic synthesis fallback
  let reply = `Based on your request (**${updatedIntent.summary}**), I evaluated our Steam catalog against your hard constraints and soft preferences.\n\n`;
  if (recResult.recommendations.length > 0) {
    reply += `Here are the top matches that strictly satisfy your criteria:\n\n`;
    for (const g of recResult.recommendations) {
      reply += `- **${g.title}** (${g.matchScore}% match) — ~${g.mainStoryPlaytime}h campaign. ${g.aiVerdict}\n`;
    }
  } else {
    reply += `No games in the current catalog perfectly met all simultaneous constraints. Try relaxing the playtime ceiling or genre constraints to see broader matches.`;
  }

  return {
    reply,
    activeIntent: updatedIntent,
    recommendedGames: recResult.recommendations,
    comparedGames: [],
    factualGrounding: recResult.recommendations.map(g => `${g.title}: ${g.mainStoryPlaytime}h, crafting=${g.hasCrafting}`),
  };
}
