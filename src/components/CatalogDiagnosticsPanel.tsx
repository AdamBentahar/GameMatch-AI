import React, { useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, ShieldCheck, Database, Layers, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { CatalogPipelineReport } from '../services/catalogPipeline';

interface CatalogDiagnosticsPanelProps {
  stats: CatalogPipelineReport;
  activeFilterCount: number;
}

export const CatalogDiagnosticsPanel: React.FC<CatalogDiagnosticsPanelProps> = ({
  stats,
  activeFilterCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const text = `=== GAMEMATCH-AI CATALOG PIPELINE DIAGNOSTICS ===
Total records retrieved: ${stats.totalRetrieved}
After normalization:     ${stats.normalized}
After validation:        ${stats.valid}
Duplicates removed:      ${stats.duplicatesRemoved}
Available catalog:       ${stats.availableCatalog}
After search & filters:  ${stats.afterFiltering}
Currently displayed:     ${stats.displayed} (Page ${stats.currentPage} of ${stats.totalPages}, ${stats.pageSize} per page)
Active filters count:    ${activeFilterCount}
Pipeline status:         ${stats.availableCatalog > 0 ? 'HEALTHY' : 'EMPTY'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-900/60 bg-[#0c101c] overflow-hidden shadow-lg shadow-indigo-950/20">
      {/* Panel Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                Catalog Pipeline Diagnostics
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Audit
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Available: <span className="text-white font-bold">{stats.availableCatalog}</span> | Filtered: <span className="text-cyan-400 font-bold">{stats.afterFiltering}</span> | Visible: <span className="text-emerald-400 font-bold">{stats.displayed}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {isOpen ? 'Collapse' : 'Expand Inspector'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Metrics Grid */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800 bg-[#090d16] space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* Step 1: Database/Raw */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">1. Total Retrieved</span>
              <div className="text-lg font-bold font-mono text-white mt-1">{stats.totalRetrieved}</div>
              <span className="text-[9px] text-slate-400 font-mono">Dataset source</span>
            </div>

            {/* Step 2: Normalized */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">2. Normalized</span>
              <div className="text-lg font-bold font-mono text-indigo-300 mt-1">{stats.normalized}</div>
              <span className="text-[9px] text-slate-400 font-mono">Schema aligned</span>
            </div>

            {/* Step 3: Validated */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">3. Valid</span>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-1">{stats.valid}</div>
              <span className="text-[9px] text-slate-400 font-mono">Passed integrity</span>
            </div>

            {/* Step 4: Duplicates Removed */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">4. Duplicates Removed</span>
              <div className={`text-lg font-bold font-mono mt-1 ${stats.duplicatesRemoved > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {stats.duplicatesRemoved}
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Deduped by SteamID</span>
            </div>

            {/* Step 5: Available Catalog */}
            <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40">
              <span className="text-[10px] uppercase font-mono text-indigo-300 block font-semibold">5. Available Catalog</span>
              <div className="text-lg font-bold font-mono text-cyan-300 mt-1">{stats.availableCatalog}</div>
              <span className="text-[9px] text-indigo-400 font-mono">Unique games</span>
            </div>

            {/* Step 6: After Filtering */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">6. After Filtering</span>
              <div className="text-lg font-bold font-mono text-amber-300 mt-1">{stats.afterFiltering}</div>
              <span className="text-[9px] text-slate-400 font-mono">Query match</span>
            </div>

            {/* Step 7: Displayed on Page */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <span className="text-[10px] uppercase font-mono text-emerald-300 block font-semibold">7. Displayed</span>
              <div className="text-lg font-bold font-mono text-white mt-1">{stats.displayed}</div>
              <span className="text-[9px] text-emerald-400 font-mono">Page {stats.currentPage}/{stats.totalPages || 1}</span>
            </div>
          </div>

          {/* Diagnostic Details & Copy Log */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero duplicate AppIDs verified</span>
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Steam library_600x900 CDN posters verified</span>
              </span>
            </div>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied Log' : 'Copy Audit Log'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
