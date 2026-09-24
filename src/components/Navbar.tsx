import React from 'react';
import { Gamepad2, Users, BookmarkCheck, Sparkles, Bot, Terminal, Globe, DownloadCloud, BookOpen } from 'lucide-react';

export type AppTab = 'advisor' | 'companion' | 'codex' | 'steam-store' | 'evaluations' | 'squads' | 'backlog';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  backlogCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, backlogCount }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0e131d]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('advisor')} 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-[#0b0e14] rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg sm:text-xl tracking-wider text-white">
                GameMatch<span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Steam Engine & Factual Companion</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>AI Advisor</span>
          </button>

          <button
            onClick={() => setActiveTab('companion')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'companion'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>AI Companion</span>
          </button>

          <button
            onClick={() => setActiveTab('codex')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'codex'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Game Codex</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
              Story & Art
            </span>
          </button>

          <button
            onClick={() => setActiveTab('steam-store')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'steam-store'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-cyan-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>Steam Store</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
              100k+
            </span>
          </button>

          <button
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'evaluations'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Audit Suite</span>
            <span className="sm:hidden">Tests</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              10/10
            </span>
          </button>

          <button
            onClick={() => setActiveTab('squads')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'squads'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Squads</span>
          </button>

          <button
            onClick={() => setActiveTab('backlog')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 relative cursor-pointer ${
              activeTab === 'backlog'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Backlog</span>
            {backlogCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                {backlogCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
