import React, { useState, useRef, useEffect } from 'react';
import { GameItem, ChatMessage, ParsedUserIntent } from '../types';
import { 
  Bot, User, Send, Sparkles, Scale, CheckCircle2, Clock, 
  ExternalLink, Layers, X, ShieldCheck, Flame, RotateCcw, HelpCircle
} from 'lucide-react';

interface AICompanionViewProps {
  onOpenDetails: (game: GameItem) => void;
}

const SUGGESTED_QUESTIONS = [
  "Compare Elden Ring vs Dark Souls 3",
  "How long does Red Dead Redemption 2 take to finish?",
  "Does Helldivers 2 have PvP?",
  "Can I play It Takes Two alone?",
  "Give me something like Elden Ring",
];

export const AICompanionView: React.FC<AICompanionViewProps> = ({ onOpenDetails }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      role: 'assistant',
      content: "Hello! I am your **GameMatch AI Companion**. I answer natural language gaming questions with zero hallucinations, grounded strictly in factual Steam metadata.\n\nYou can ask me to:\n- **Compare games**: *\"What's the difference between Elden Ring and Dark Souls 3?\"*\n- **Answer factual queries**: *\"How long does Red Dead Redemption 2 take?\"*, *\"Does Helldivers 2 have PvP?\"*, *\"Can I play It Takes Two alone?\"*\n- **Refine recommendations across turns**: Ask for a game, then say *\"Shorter\"*, then *\"And I don't want crafting\"*.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<ParsedUserIntent | null>(null);
  const [lastComparedGames, setLastComparedGames] = useState<GameItem[]>([]);
  const [lastRecommendedGames, setLastRecommendedGames] = useState<GameItem[]>([]);
  const [groundingNotes, setGroundingNotes] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: messages,
          activeIntent: activeIntent || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Companion service returned an error');
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedGames: data.recommendedGames,
        comparedGames: data.comparedGames,
        factualGrounding: data.factualGrounding,
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (data.activeIntent) setActiveIntent(data.activeIntent);
      if (data.comparedGames?.length) setLastComparedGames(data.comparedGames);
      if (data.recommendedGames?.length) setLastRecommendedGames(data.recommendedGames);
      if (data.factualGrounding?.length) setGroundingNotes(data.factualGrounding);
    } catch (err: any) {
      console.error('Companion request failed:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          role: 'assistant',
          content: 'Sorry, I encountered a connection delay. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearContext = () => {
    setActiveIntent(null);
    setLastComparedGames([]);
    setLastRecommendedGames([]);
    setGroundingNotes([]);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        role: 'assistant',
        content: 'Session intent cleared. You can start fresh with any game comparison, factual inquiry, or recommendation request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/40 border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-display font-bold text-white">
              Truthful AI Game Companion
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              Grounded Catalog
            </span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Directly answers game comparisons, completion times, PvP/co-op viability, and remembers conversation context for iterative query refinement.
          </p>
        </div>

        {activeIntent && (
          <button
            onClick={handleClearContext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 shrink-0 self-start sm:self-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Intent Memory</span>
          </button>
        )}
      </div>

      {/* Active Conversational Memory Intent Bar */}
      {activeIntent && (
        <div className="p-3.5 rounded-xl bg-[#0f1422] border border-indigo-500/30 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-indigo-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Active Memory Filters:</span>
          </span>
          {activeIntent.referenceGames.map(rg => (
            <span key={rg} className="px-2.5 py-0.5 rounded-md bg-indigo-900/60 border border-indigo-700 text-indigo-200 font-medium">
              Like: {rg}
            </span>
          ))}
          {activeIntent.maxPlaytime && (
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-900/60 border border-cyan-700 text-cyan-200 font-medium">
              Max: {activeIntent.maxPlaytime}h
            </span>
          )}
          {activeIntent.crafting === false && (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-900/60 border border-emerald-700 text-emerald-200 font-medium">
              No Crafting
            </span>
          )}
          {activeIntent.singlePlayer && (
            <span className="px-2.5 py-0.5 rounded-md bg-purple-900/60 border border-purple-700 text-purple-200 font-medium">
              Solo Only
            </span>
          )}
          {activeIntent.pvp === false && (
            <span className="px-2.5 py-0.5 rounded-md bg-amber-900/60 border border-amber-700 text-amber-200 font-medium">
              No PvP
            </span>
          )}
          {activeIntent.jumpScares === false && (
            <span className="px-2.5 py-0.5 rounded-md bg-rose-900/60 border border-rose-700 text-rose-200 font-medium">
              No Jump Scares
            </span>
          )}
          <span className="text-slate-500 italic text-[11px] ml-auto">
            (Follow-up questions like "Shorter" or "Without crafting" will update this state)
          </span>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="rounded-2xl bg-[#0d121c] border border-slate-800/80 p-4 sm:p-6 min-h-[420px] max-h-[600px] overflow-y-auto space-y-6">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl space-y-3 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-[#151c2c] text-slate-200 border border-slate-700/80 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Render markdown formatted text with linebreaks and bolding */}
                <div className="whitespace-pre-line space-y-2">
                  {msg.content}
                </div>
              </div>

              {/* Compared Games Side-by-Side Cards (if message was a comparison) */}
              {msg.comparedGames && msg.comparedGames.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {msg.comparedGames.map(game => (
                    <div
                      key={game.id}
                      onClick={() => onOpenDetails(game)}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <img
                        src={game.posterUrl || game.bannerUrl}
                        alt={game.title}
                        className="w-12 aspect-[2/3] object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.bannerUrl;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                          {game.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ~{game.mainStoryPlaytime}h story • {game.difficulty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended Games Attached Cards */}
              {msg.recommendedGames && msg.recommendedGames.length > 0 && !msg.comparedGames?.length && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {msg.recommendedGames.slice(0, 4).map(game => (
                    <div
                      key={game.id}
                      onClick={() => onOpenDetails(game)}
                      className="p-3 rounded-xl bg-[#111724] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <img
                        src={game.posterUrl || game.bannerUrl}
                        alt={game.title}
                        className="w-12 aspect-[2/3] object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.bannerUrl;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                            {game.title}
                          </h4>
                          {game.matchScore && (
                            <span className="text-[10px] font-mono font-bold text-emerald-400">
                              {game.matchScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          ~{game.mainStoryPlaytime}h • {game.hasCrafting ? 'Crafting' : 'No Crafting'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-500 font-mono block px-1">
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-cyan-300 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-[#151c2c] border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Querying verified Steam database and resolving constraints...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[11px]">Quick Inquiry Prompts:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 hover:text-indigo-300 border border-slate-700 text-xs text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask a question, compare two games, or refine current recommendations (e.g. 'Shorter', 'Without crafting')..."
          disabled={isLoading}
          className="w-full pl-4 pr-28 py-3.5 bg-[#0d121c] border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm shadow-inner disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputQuery.trim()}
          className="absolute right-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
