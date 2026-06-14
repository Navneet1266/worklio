import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChevronLeft, Star, Users, LayoutGrid, List as ListIcon,
  Search, Layers, Share2, Filter, X, Zap, Settings2,
  BarChart2, CheckCircle, Clock, TrendingUp, Plus,
} from 'lucide-react';
import { fetchBoard, clearBoard, updateBoardDetails } from '../store/slices/boardSlice';
import { fetchSprints, clearSprints } from '../store/slices/sprintSlice';
import { useSocket } from '../hooks/useSocket';
import Board from '../components/Board/Board';
import CardModal from '../components/Card/CardModal';
import SprintBanner from '../components/Sprint/SprintBanner';
import SprintManager from '../components/Sprint/SprintManager';
import TeamView from '../components/Board/TeamView';
import toast from 'react-hot-toast';
import api from '../api/axios';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

const PRIORITY_FILTER = [
  { value: 'urgent', label: 'Urgent', dot: '#ef4444' },
  { value: 'high',   label: 'High',   dot: '#f97316' },
  { value: 'medium', label: 'Medium', dot: '#eab308' },
  { value: 'low',    label: 'Low',    dot: '#22c55e' },
];

const TYPE_FILTER = [
  { value: 'bug',         label: 'Bug',         icon: '🐛' },
  { value: 'feature',     label: 'Feature',     icon: '✨' },
  { value: 'task',        label: 'Task',        icon: '☑️' },
  { value: 'improvement', label: 'Improvement', icon: '⚡' },
  { value: 'epic',        label: 'Epic',        icon: '🚀' },
];

export default function BoardPage() {
  const { boardId } = useParams();
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const { board, lists, loading, error, activeCard, onlineUsers } = useSelector(s => s.board);
  const { user }    = useSelector(s => s.auth);
  const { sprints } = useSelector(s => s.sprints);

  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterType, setFilterType]         = useState([]);
  const [filterAssignee, setFilterAssignee] = useState([]);
  const [showFilters, setShowFilters]       = useState(false);
  const [showSearch, setShowSearch]         = useState(false);
  const [showSprintManager, setShowSprintManager] = useState(false);
  const [showTeamView, setShowTeamView]     = useState(false);

  useSocket(boardId);

  useEffect(() => {
    dispatch(fetchBoard(boardId));
    dispatch(fetchSprints(boardId));
    return () => { dispatch(clearBoard()); dispatch(clearSprints()); };
  }, [boardId]);

  const totalCards = useMemo(() => lists.reduce((s, l) => s + l.cards.length, 0), [lists]);
  const doneCards  = useMemo(() => lists.reduce((s, l) => s + l.cards.filter(c => c.progress >= 100).length, 0), [lists]);
  const overdueCards = useMemo(() => lists.reduce((s, l) => s + l.cards.filter(c => c.dueDate && new Date(c.dueDate) < new Date() && c.progress < 100).length, 0), [lists]);
  const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);
  const hasFilters = searchQuery || filterPriority.length || filterType.length || filterAssignee.length;
  const clearFilters = () => { setSearchQuery(''); setFilterPriority([]); setFilterType([]); setFilterAssignee([]); };

  if (loading) {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="h-[68px] bg-black/20 animate-pulse" />
        <div className="flex-1 flex items-start gap-4 p-5 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-[292px] shrink-0 rounded-3xl flex flex-col gap-2 p-3"
              style={{ background: 'rgba(255,255,255,0.1)', height: 420 }}>
              <div className="h-5 w-2/3 bg-white/10 rounded-lg mb-2" />
              {[1,2,3].map(j => (
                <div key={j} className="h-24 rounded-2xl bg-white/10" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-5">
            <Layers size={32} className="text-white/40" />
          </div>
          <p className="text-white/60 mb-5 text-sm">{error || 'Board not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const isStarred    = board.starred?.includes(user?._id);
  const boardMembers = board.members || [];

  const handleStar = async () => {
    try {
      const { data } = await api.post(`/boards/${boardId}/star`);
      const newStarred = data.starred
        ? [...(board.starred || []), user?._id]
        : (board.starred || []).filter(id => id !== user?._id);
      dispatch(updateBoardDetails({ id: boardId, starred: newStarred }));
      toast(data.starred ? '⭐ Starred!' : 'Removed from starred');
    } catch {}
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: board.background }}>

      {/* Subtle global overlay for contrast */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-0" />

      {/* ══ HEADER ══ */}
      <header className="relative z-10 shrink-0 flex items-center gap-3 px-5 h-[68px]"
        style={{ background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Back */}
        <button onClick={() => navigate('/dashboard')}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0">
          <ChevronLeft size={18} />
        </button>

        <div className="w-px h-5 bg-white/15 shrink-0" />

        {/* Board identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Board color swatch */}
          <div className="w-9 h-9 rounded-xl shrink-0 shadow-lg border border-white/20"
            style={{ background: board.background }} />
          <div className="min-w-0">
            <h1 className="text-white font-black text-[17px] tracking-tight leading-tight truncate max-w-[260px]">
              {board.title}
            </h1>
            {activeSprint && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-white/50 text-[11px] font-semibold truncate">{activeSprint.title} · Active</span>
              </div>
            )}
          </div>
          <button onClick={handleStar} title={isStarred ? 'Unstar' : 'Star'}
            className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isStarred ? 'text-amber-400 bg-amber-400/15' : 'text-white/30 hover:text-white/70 hover:bg-white/10'
            }`}>
            <Star size={15} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Quick stats chips — hidden on small screens */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          <StatChip icon={LayoutGrid} label={`${lists.length} lists`} />
          <StatChip icon={Layers} label={`${totalCards} issues`} />
          {doneCards > 0 && <StatChip icon={CheckCircle} label={`${doneCards} done`} accent="emerald" />}
          {overdueCards > 0 && <StatChip icon={Clock} label={`${overdueCards} overdue`} accent="red" />}
        </div>

        <div className="flex-1" />

        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map(u => (
                <div key={u._id} title={`${u.name} is online`}
                  className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-white text-[11px] font-black shadow-md ring-1 ring-emerald-400/50"
                  style={{ background: avatarColor(u.name) }}>
                  {u.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/15 flex items-center justify-center text-white text-[10px] font-black">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
            <span className="text-white/40 text-xs font-semibold hidden lg:block">{onlineUsers.length} online</span>
          </div>
        )}

        {/* All members */}
        {boardMembers.length > 0 && onlineUsers.length === 0 && (
          <div className="flex -space-x-2 shrink-0">
            {boardMembers.slice(0, 4).map(m => (
              <div key={m._id} title={m.name}
                className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-white text-[11px] font-black shadow-md"
                style={{ background: avatarColor(m.name) }}>
                {m.name?.[0]?.toUpperCase()}
              </div>
            ))}
            {boardMembers.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/15 flex items-center justify-center text-white text-[10px] font-black">
                +{boardMembers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Share */}
        <button className="hidden md:flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-colors shrink-0">
          <Share2 size={13} /> Share
        </button>
      </header>

      {/* ══ TOOLBAR ══ */}
      <div className="relative z-10 shrink-0 flex items-center gap-2 px-5 h-11"
        style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>

        {/* Sprint manager button */}
        <button onClick={() => setShowSprintManager(true)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 transition-colors">
          <Zap size={12} /> Sprints
        </button>

        <div className="flex-1" />

        {/* Search */}
        {showSearch ? (
          <div className="flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <Search size={13} className="text-white/60 shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search issues…"
              className="bg-transparent text-white text-xs outline-none placeholder:text-white/40 w-40"
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white/80"><X size={12} /></button>
            )}
          </div>
        ) : (
          <button onClick={() => setShowSearch(true)}
            className="w-8 h-8 rounded-xl text-white/50 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors">
            <Search size={15} />
          </button>
        )}

        {/* Filters */}
        <div className="relative">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
              hasFilters
                ? 'bg-indigo-500/80 text-white border-indigo-400/50 shadow-sm'
                : 'text-white/60 hover:text-white bg-white/8 hover:bg-white/15 border-white/10'
            }`}>
            <Filter size={13} />
            <span className="hidden sm:block">Filter</span>
            {hasFilters && (
              <span className="text-[10px] font-black bg-white/25 px-1.5 py-0.5 rounded-full">
                {filterPriority.length + filterType.length + filterAssignee.length + (searchQuery ? 1 : 0)}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-76 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50 animate-scale-in"
              style={{ width: 292 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Filter size={14} className="text-indigo-500" /> Filter issues
                </h3>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg">
                    Clear all
                  </button>
                )}
              </div>
              <FilterSection label="Priority">
                {PRIORITY_FILTER.map(p => (
                  <FilterChip key={p.value}
                    active={filterPriority.includes(p.value)}
                    onClick={() => setFilterPriority(prev => prev.includes(p.value) ? prev.filter(x => x !== p.value) : [...prev, p.value])}>
                    <div className="w-2 h-2 rounded-full" style={{ background: p.dot }} /> {p.label}
                  </FilterChip>
                ))}
              </FilterSection>
              <FilterSection label="Type">
                {TYPE_FILTER.map(t => (
                  <FilterChip key={t.value}
                    active={filterType.includes(t.value)}
                    onClick={() => setFilterType(prev => prev.includes(t.value) ? prev.filter(x => x !== t.value) : [...prev, t.value])}>
                    {t.icon} {t.label}
                  </FilterChip>
                ))}
              </FilterSection>
              {boardMembers.length > 0 && (
                <FilterSection label="Assignee">
                  {boardMembers.map(m => (
                    <FilterChip key={m._id}
                      active={filterAssignee.includes(m._id)}
                      onClick={() => setFilterAssignee(prev => prev.includes(m._id) ? prev.filter(x => x !== m._id) : [...prev, m._id])}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: avatarColor(m.name) }}>
                        {m.name?.[0]}
                      </div>
                      {m.name?.split(' ')[0]}
                    </FilterChip>
                  ))}
                </FilterSection>
              )}
            </div>
          )}
        </div>

        {/* Team view */}
        <button onClick={() => setShowTeamView(true)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 transition-colors">
          <Users size={13} /><span className="hidden sm:block">Team</span>
        </button>

        {/* View toggle */}
        <div className="hidden sm:flex items-center gap-0.5 bg-white/10 border border-white/15 rounded-xl p-0.5">
          <button className="p-1.5 rounded-lg text-white" style={{ background: 'rgba(255,255,255,0.2)' }} title="Board view">
            <LayoutGrid size={14} />
          </button>
          <button className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors" title="List view (coming soon)">
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      {/* Sprint banner */}
      <div className="relative z-10 shrink-0">
        <SprintBanner onManage={() => setShowSprintManager(true)} />
      </div>

      {/* ══ BOARD ══ */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <Board boardId={boardId}
          searchQuery={searchQuery}
          filterPriority={filterPriority}
          filterType={filterType}
          filterAssignee={filterAssignee} />
      </div>

      {activeCard && <CardModal />}
      {showSprintManager && <SprintManager boardId={boardId} onClose={() => setShowSprintManager(false)} />}
      {showTeamView && <TeamView onClose={() => setShowTeamView(false)} />}
    </div>
  );
}

function StatChip({ icon: Icon, label, accent }) {
  const colors = accent === 'emerald'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : accent === 'red'
    ? 'bg-red-500/20 text-red-300 border-red-500/30'
    : 'bg-white/10 text-white/60 border-white/10';
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${colors}`}>
      <Icon size={12} /> {label}
    </div>
  );
}

function FilterSection({ label, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
        active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
      }`}>
      {children}
    </button>
  );
}
