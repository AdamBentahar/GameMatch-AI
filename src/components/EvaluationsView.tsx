import React, { useState, useEffect } from 'react';
import { EvaluationResult, GameItem } from '../types';
import { 
  CheckCircle2, XCircle, Play, RefreshCw, Layers, ShieldCheck, 
  Sparkles, Terminal, ChevronDown, ChevronUp, Clock, AlertTriangle 
} from 'lucide-react';

interface EvaluationsViewProps {
  onOpenDetails: (game: GameItem) => void;
}

export const EvaluationsView: React.FC<EvaluationsViewProps> = ({ onOpenDetails }) => {
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);

  const fetchEvaluations = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/evaluations');
      const data = await res.json();
      setResults(data.results || []);
      setAccuracy(data.accuracy ?? 100);
    } catch (err) {
      console.error('Failed to run evaluations:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedQueryId(prev => (prev === id ? null : id));
  };

  const passCount = results.filter(r => r.verdict === 'PASS').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-[#101624] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-display font-bold text-white">
              Automated Evaluation Suite (Golden Queries)
            </h2>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Continuously tests the recommendation engine against 10 critical benchmark queries, validating hard constraint enforcement, negative preference filtering, and factual playtime ceilings.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono block">Pass Rate</span>
            <span className="text-2xl font-display font-extrabold text-emerald-400">
              {accuracy !== null ? `${accuracy}%` : '--'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              {passCount} / {results.length} Passing
            </span>
          </div>

          <button
            onClick={fetchEvaluations}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Evaluating...' : 'Re-Run Suite'}</span>
          </button>
        </div>
      </div>

      {/* Query Results List */}
      <div className="space-y-3">
        {results.map((item, index) => {
          const isExpanded = expandedQueryId === item.queryId;

          return (
            <div
              key={item.queryId}
              className={`rounded-xl border transition-all ${
                item.verdict === 'PASS'
                  ? 'bg-[#0f1422] border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-800/40'
              }`}
            >
              {/* Header Row */}
              <div
                onClick={() => toggleExpand(item.queryId)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 bg-slate-800 text-slate-300">
                    {index + 1}
                  </span>

                  {item.verdict === 'PASS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      "{item.queryText}"
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Intent: {item.extractedIntent.summary || 'None'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                      item.verdict === 'PASS'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {item.verdict}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="p-4 pt-0 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                    {/* Hard Constraints Checklist */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <span className="font-mono text-slate-400 uppercase text-[10px] block">
                        Verification Criteria
                      </span>
                      <p className="text-slate-300">
                        {item.notes}
                      </p>
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                        <span className="text-slate-400">Hard Constraints Passed:</span>
                        <span className={item.hardConstraintsPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {item.hardConstraintsPassed ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>

                    {/* Extracted Structured Intent */}
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-[11px] font-mono">
                      <span className="text-slate-400 uppercase text-[10px] block">
                        Extracted Structured Intent
                      </span>
                      {Boolean(item.extractedIntent.referenceGames?.length) && (
                        <div>
                          <span className="text-slate-500">Ref: </span>
                          <span className="text-indigo-300">{item.extractedIntent.referenceGames?.join(', ')}</span>
                        </div>
                      )}
                      {item.extractedIntent.maxPlaytime !== undefined && item.extractedIntent.maxPlaytime !== null && (
                        <div>
                          <span className="text-slate-500">Max Playtime: </span>
                          <span className="text-cyan-300">&lt;= {item.extractedIntent.maxPlaytime} hours</span>
                        </div>
                      )}
                      {item.extractedIntent.crafting === false && (
                        <div>
                          <span className="text-slate-500">Crafting: </span>
                          <span className="text-emerald-300">FALSE (Strictly Excluded)</span>
                        </div>
                      )}
                      {Boolean(item.extractedIntent.negativePreferences?.length) && (
                        <div>
                          <span className="text-slate-500">Negatives: </span>
                          <span className="text-amber-300">{item.extractedIntent.negativePreferences?.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Recommendations Table */}
                  <div>
                    <span className="font-mono text-slate-400 uppercase text-[10px] block mb-2">
                      Top Recommendations & Verification
                    </span>
                    <div className="space-y-2">
                      {item.topRecommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{rec.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-cyan-300">
                              ~{rec.playtime}h campaign
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-400">
                              {rec.score}% Match
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] italic max-w-xl truncate">
                            "{rec.reason}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
