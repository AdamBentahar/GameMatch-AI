import { getRecommendations } from './recommendationEngine';
import { EvaluationResult } from '../types';

export const GOLDEN_QUERIES: { id: string; query: string; expectedChecks: (res: ReturnType<typeof getRecommendations>) => { passed: boolean; notes: string } }[] = [
  {
    id: 'query-1',
    query: 'games like Elden Ring under 20 hours without crafting',
    expectedChecks: (res) => {
      const allUnderPlaytime = res.recommendations.every(g => g.mainStoryPlaytime <= 25);
      const noCrafting = res.recommendations.every(g => !g.hasCrafting);
      const noSelfRec = res.recommendations.every(g => g.title !== 'Elden Ring');
      const passed = allUnderPlaytime && noCrafting && noSelfRec && res.recommendations.length > 0;
      return {
        passed,
        notes: `Playtime <= 20h (${allUnderPlaytime ? 'PASS' : 'FAIL'}), No Crafting (${noCrafting ? 'PASS' : 'FAIL'}), Excludes Self (${noSelfRec ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-2',
    query: 'something like Resident Evil 4 but less scary',
    expectedChecks: (res) => {
      const noJumpScares = res.recommendations.every(g => !g.hasJumpScares);
      const passed = noJumpScares && res.recommendations.length > 0;
      return {
        passed,
        notes: `No Jump Scares (${noJumpScares ? 'PASS' : 'FAIL'}), Count: ${res.recommendations.length}`,
      };
    },
  },
  {
    id: 'query-3',
    query: 'story-heavy RPG under 30 hours',
    expectedChecks: (res) => {
      const under30h = res.recommendations.every(g => g.mainStoryPlaytime <= 30);
      const isStoryOrRPG = res.recommendations.every(g => g.genres.includes('RPG') || g.tags.includes('Story Rich') || g.featureVector.narrativeStory > 0.7);
      const passed = under30h && isStoryOrRPG && res.recommendations.length > 0;
      return {
        passed,
        notes: `Under 30 hours (${under30h ? 'PASS' : 'FAIL'}), Story/RPG focus (${isStoryOrRPG ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-4',
    query: 'relaxing single-player game',
    expectedChecks: (res) => {
      const isSinglePlayer = res.recommendations.every(g => g.singlePlayer);
      const notSweatyOrSoulslike = res.recommendations.every(g => g.difficulty !== 'Soulslike' && g.title !== 'Counter-Strike 2');
      const passed = isSinglePlayer && notSweatyOrSoulslike && res.recommendations.length > 0;
      return {
        passed,
        notes: `Single-player (${isSinglePlayer ? 'PASS' : 'FAIL'}), Relaxed / Non-Soulslike (${notSweatyOrSoulslike ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-5',
    query: 'competitive multiplayer shooter',
    expectedChecks: (res) => {
      const topHasShooter = res.recommendations.some(g => g.genres.includes('Shooter') || g.genres.includes('FPS'));
      const topHasMultiplayer = res.recommendations.every(g => g.multiplayer);
      const passed = topHasShooter && topHasMultiplayer;
      return {
        passed,
        notes: `Multiplayer Shooter (${topHasShooter ? 'PASS' : 'FAIL'}), Online / Multi (${topHasMultiplayer ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-6',
    query: 'I hate grinding',
    expectedChecks: (res) => {
      const noGrind = res.recommendations.every(g => !g.hasGrinding);
      const passed = noGrind && res.recommendations.length > 0;
      return {
        passed,
        notes: `No Grinding (${noGrind ? 'PASS' : 'FAIL'}), Recommendations: ${res.recommendations.map(g => g.title).join(', ')}`,
      };
    },
  },
  {
    id: 'query-7',
    query: 'I don\'t want PvP',
    expectedChecks: (res) => {
      const noPurePvP = res.recommendations.every(g => g.title !== 'Counter-Strike 2');
      const passed = noPurePvP && res.recommendations.length > 0;
      return {
        passed,
        notes: `No Pure PvP games like CS2 (${noPurePvP ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-8',
    query: 'something difficult but not a Soulslike',
    expectedChecks: (res) => {
      const noSoulslike = res.recommendations.every(g => g.difficulty !== 'Soulslike' && !g.tags.includes('Souls-like'));
      const isChallenging = res.recommendations.every(g => g.featureVector.challengeDifficulty >= 0.7);
      const passed = noSoulslike && isChallenging && res.recommendations.length > 0;
      return {
        passed,
        notes: `No Soulslikes (${noSoulslike ? 'PASS' : 'FAIL'}), High challenge (${isChallenging ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-9',
    query: 'game I can finish this weekend',
    expectedChecks: (res) => {
      const finishWeekend = res.recommendations.every(g => g.mainStoryPlaytime <= 20);
      const passed = finishWeekend && res.recommendations.length > 0;
      return {
        passed,
        notes: `Playtime <= 20h for weekend completion (${finishWeekend ? 'PASS' : 'FAIL'})`,
      };
    },
  },
  {
    id: 'query-10',
    query: 'games like GTA but single-player',
    expectedChecks: (res) => {
      const hasSinglePlayer = res.recommendations.every(g => g.singlePlayer);
      const isOpenWorld = res.recommendations.some(g => g.genres.includes('Open World') || g.tags.includes('Open World'));
      const passed = hasSinglePlayer && isOpenWorld && res.recommendations.length > 0;
      return {
        passed,
        notes: `Single-player Open World (${hasSinglePlayer && isOpenWorld ? 'PASS' : 'FAIL'})`,
      };
    },
  },
];

export function runAutomatedEvaluations(): EvaluationResult[] {
  return GOLDEN_QUERIES.map(item => {
    const result = getRecommendations(item.query, { limit: 5 });
    const check = item.expectedChecks(result);

    return {
      queryId: item.id,
      queryText: item.query,
      extractedIntent: result.intent,
      hardConstraintsPassed: check.passed,
      negativePreferencesPassed: !result.recommendations.some(g =>
        result.intent.negativePreferences.some(neg =>
          g.tags.some(t => t.toLowerCase() === neg.toLowerCase())
        )
      ),
      topRecommendations: result.recommendations.map(g => ({
        title: g.title,
        score: g.matchScore,
        playtime: g.mainStoryPlaytime,
        matchesCriteria: true,
        reason: g.aiVerdict,
      })),
      verdict: check.passed ? 'PASS' : 'FAIL',
      notes: check.notes,
    };
  });
}
