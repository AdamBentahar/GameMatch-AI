import React, { useState, useEffect } from 'react';
import { TeammateBeacon } from '../types';
import { Users, Mic, MicOff, Plus, Shield, Globe, Tag, Check, Sparkles, Filter, Search } from 'lucide-react';

export const SquadFinder: React.FC = () => {
  const [beacons, setBeacons] = useState<TeammateBeacon[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayStyle, setSelectedPlayStyle] = useState('all');
  const [micOnly, setMicOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New beacon form state
  const [newGameTitle, setNewGameTitle] = useState('Helldivers 2');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlayStyle, setNewPlayStyle] = useState<'Casual' | 'Competitive' | 'Lore / Story' | 'Hardcore'>('Casual');
  const [newMicRequired, setNewMicRequired] = useState(true);
  const [newSlotsMax, setNewSlotsMax] = useState(4);
  const [newRegion, setNewRegion] = useState('EU');
  const [newCreatorName, setNewCreatorName] = useState('Gamer_X');
  const [newTags, setNewTags] = useState('Chill, MicOn, Co-op');

  const [joinedBeaconIds, setJoinedBeaconIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBeacons();
  }, [selectedPlayStyle, micOnly]);

  const fetchBeacons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPlayStyle !== 'all') params.append('playStyle', selectedPlayStyle);
      if (micOnly) params.append('micRequired', 'true');

      const res = await fetch(`/api/teammates?${params.toString()}`);
      const data = await res.json();
      setBeacons(data);
    } catch (err) {
      console.error('Failed to load beacons', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (beacon: TeammateBeacon) => {
    if (joinedBeaconIds.includes(beacon.id)) return;
    try {
      const res = await fetch(`/api/teammates/${beacon.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: newCreatorName }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinedBeaconIds(prev => [...prev, beacon.id]);
        setBeacons(prev =>
          prev.map(b => (b.id === beacon.id ? { ...b, slotsCurrent: data.slotsCurrent } : b))
        );
        showToast(data.message);
      }
    } catch (err) {
      console.error('Join error', err);
    }
  };

  const handleCreateBeacon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newGameTitle.trim()) return;

    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/teammates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: newGameTitle.toLowerCase().replace(/\s+/g, '-'),
          gameTitle: newGameTitle,
          creatorName: newCreatorName || 'Pilot_01',
          creatorAvatar: '🚀',
          creatorRank: 'Tactician',
          gamerPersona: 'Squad Leader',
          title: newTitle,
          description: newDesc,
          playStyle: newPlayStyle,
          micRequired: newMicRequired,
          slotsMax: newSlotsMax,
          region: newRegion,
          language: 'English',
          tags: tagsArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        fetchBeacons();
        showToast('Squad Beacon broadcasted to the community!');
      }
    } catch (err) {
      console.error('Failed to create beacon', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredBeacons = beacons.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.gameTitle.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q) ||
      b.creatorName.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-indigo-600 text-white shadow-xl shadow-indigo-950 flex items-center gap-2 border border-indigo-400">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#111928] via-[#0f1725] to-[#131b2c] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Users className="w-3.5 h-3.5" />
            <span>Community Teammate & Squad Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Find Your Next Co-op Squad
          </h2>
          <p className="text-slate-300 text-sm max-w-xl">
            Never solo queue into the void again. Match with like-minded players by game, communication style, and vibe.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Post Squad Beacon</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 rounded-2xl bg-[#0f1422] border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by game, tags, or host..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['all', 'Casual', 'Competitive', 'Lore / Story'].map(style => (
              <button
                key={style}
                onClick={() => setSelectedPlayStyle(style)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  selectedPlayStyle === style
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMicOnly(!micOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${
              micOnly
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {micOnly ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>Mic Required</span>
          </button>
        </div>
      </div>

      {/* Beacons Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading active beacons...</div>
      ) : filteredBeacons.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0f1422] border border-slate-800 text-center space-y-3">
          <Users className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No active beacons matching this filter</h3>
          <p className="text-xs text-slate-400">Be the first to post a beacon for your squad!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Squad Beacon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBeacons.map(beacon => {
            const hasJoined = joinedBeaconIds.includes(beacon.id);
            const isFull = beacon.slotsCurrent >= beacon.slotsMax;

            return (
              <div
                key={beacon.id}
                className="p-5 rounded-2xl bg-[#101625] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Host row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-base">
                        {beacon.creatorAvatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{beacon.creatorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({beacon.creatorRank})</span>
                        </div>
                        <span className="text-[11px] text-indigo-400">{beacon.gamerPersona}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">{beacon.createdAt}</span>
                  </div>

                  {/* Title & Game */}
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono mb-1.5">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>{beacon.gameTitle}</span>
                    </div>
                    <h4 className="text-base font-display font-bold text-white">
                      {beacon.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {beacon.description}
                    </p>
                  </div>

                  {/* Badges / Specs */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      {beacon.playStyle}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      <Globe className="w-3 h-3 text-indigo-400" />
                      <span>{beacon.region}</span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      {beacon.micRequired ? (
                        <>
                          <Mic className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Mic Required</span>
                        </>
                      ) : (
                        <>
                          <MicOff className="w-3 h-3 text-slate-400" />
                          <span>Mic Optional</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {beacon.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer / Slots & Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Squad Slots:</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: beacon.slotsMax }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < beacon.slotsCurrent
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                              : 'bg-slate-800 border border-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-mono text-white ml-1">
                        {beacon.slotsCurrent}/{beacon.slotsMax}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(beacon)}
                    disabled={hasJoined || isFull}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      hasJoined
                        ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 cursor-default'
                        : isFull
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {hasJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Joined</span>
                      </>
                    ) : isFull ? (
                      <span>Full</span>
                    ) : (
                      <span>Join Squad</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Beacon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-display font-bold text-white">Broadcast Squad Beacon</h3>
            <form onSubmit={handleCreateBeacon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 uppercase font-mono mb-1">Your Gamertag</label>
                <input
                  type="text"
                  required
                  value={newCreatorName}
                  onChange={e => setNewCreatorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-mono mb-1">Game</label>
                <input
                  type="text"
                  required
                  value={newGameTitle}
                  onChange={e => setNewGameTitle(e.target.value)}
                  placeholder="e.g. Helldivers 2, Baldur's Gate 3, Deep Rock Galactic"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-mono mb-1">Squad Callout Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Need 2 for Hazard 5 Mining tonight"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-mono mb-1">Details & Loadouts</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Mention target objectives, mic usage, or expectations..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-mono mb-1">Playstyle</label>
                  <select
                    value={newPlayStyle}
                    onChange={e => setNewPlayStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Casual">Casual</option>
                    <option value="Competitive">Competitive</option>
                    <option value="Lore / Story">Lore / Story</option>
                    <option value="Hardcore">Hardcore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase font-mono mb-1">Squad Size</label>
                  <select
                    value={newSlotsMax}
                    onChange={e => setNewSlotsMax(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value={2}>2 Players (Duo)</option>
                    <option value={3}>3 Players (Trio)</option>
                    <option value={4}>4 Players (Full Squad)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-mono mb-1">Region</label>
                  <input
                    type="text"
                    value={newRegion}
                    onChange={e => setNewRegion(e.target.value)}
                    placeholder="e.g. EU West, NA East, Global"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="mic-checkbox"
                    checked={newMicRequired}
                    onChange={e => setNewMicRequired(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="mic-checkbox" className="text-slate-300 font-medium cursor-pointer">
                    Mic Required
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  Broadcast Beacon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
