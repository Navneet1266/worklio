import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import {
  X, TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart2, User,
  ChevronDown, ChevronUp, Zap, Target, Users, Activity, ArrowUp, ArrowDown,
  Minus, AlertTriangle, Award, Filter,
} from 'lucide-react';
import { isPast, isToday, format, differenceInDays } from 'date-fns';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function isOverdue(card) {
  return card.dueDate && isPast(new Date(card.dueDate)) && !isToday(new Date(card.dueDate)) && card.progress < 100;
}

function getHealth(stats) {
  if (stats.overdue > 2 || (stats.overdue > 0 && stats.pct < 30)) return 'at-risk';
  if (stats.overdue > 0 || stats.pct < 50) return 'warning';
  return 'healthy';
}

const HEALTH = {
  'at-risk': { label: 'At risk',  bar: '#ef4444', bg: 'bg-red-50',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700',    icon: AlertTriangle },
  'warning':  { label: 'At risk',  bar: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  'healthy':  { label: 'On track', bar: '#22c55e', bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className={`rounded-2xl border p-4 ${bg} border-slate-200`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color === 'text-slate-700' ? 'bg-white' : 'bg-white'}`}>
        <Icon size={16} className={color} />
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function TeamView({ onClose }) {
  const { lists, board } = useSelector(s => s.board);
  const { sprints } = useSelector(s => s.sprints);

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [sprintFilter, setSprintFilter] = useState('all');
  const [sortBy, setSortBy] = useState('workload');

  const activeSprint = sprints.find(s => s.status === 'active');

  const allCards = useMemo(() => lists.flatMap(l => l.cards.map(c => ({ ...c, listTitle: l.title }))), [lists]);

  const filteredCards = useMemo(() => {
    if (sprintFilter === 'all') return allCards;
    if (sprintFilter === 'active') return allCards.filter(c => (c.sprint?._id || c.sprint) === activeSprint?._id);
    return allCards.filter(c => (c.sprint?._id || c.sprint) === sprintFilter);
  }, [allCards, sprintFilter, activeSprint]);

  const members = useMemo(() => {
    const map = {};
    for (const card of filteredCards) {
      for (const a of (card.assignees || [])) {
        if (!map[a._id]) map[a._id] = { ...a, cards: [] };
        map[a._id].cards.push(card);
      }
    }
    return Object.values(map);
  }, [filteredCards]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const sa = getStats(a.cards), sb = getStats(b.cards);
      if (sortBy === 'workload') return sb.total - sa.total;
      if (sortBy === 'overdue') return sb.overdue - sa.overdue;
      if (sortBy === 'progress') return sb.pct - sa.pct;
      return 0;
    });
  }, [members, sortBy]);

  const unassigned = useMemo(() => filteredCards.filter(c => !c.assignees?.length), [filteredCards]);
  const boardStats = getStats(filteredCards);
  const atRiskMembers = sortedMembers.filter(m => getHealth(getStats(m.cards)) === 'at-risk');
  const maxCards = Math.max(...sortedMembers.map(m => m.cards.length), 1);

  const selectedMember = sortedMembers.find(m => m._id === selectedMemberId);
  const selectedCards = selectedMember?.cards || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-backdrop" />
      <div className="relative m-auto w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Lead Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5">{board?.title} · Track team progress &amp; workload</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sprint filter */}
            <div className="relative">
              <select value={sprintFilter} onChange={e => setSprintFilter(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-2 outline-none focus:border-indigo-400 appearance-none cursor-pointer">
                <option value="all">All time</option>
                {activeSprint && <option value="active">Current sprint</option>}
                {sprints.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
              </select>
              <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Total Issues" value={boardStats.total} icon={BarChart2} color="text-slate-700" bg="bg-white" />
            <StatCard label="Completed" value={boardStats.done} sub={`${boardStats.pct}% done`} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50/50" />
            <StatCard label="In Progress" value={boardStats.total - boardStats.done} icon={Activity} color="text-blue-600" bg="bg-blue-50/50" />
            <StatCard label="Overdue" value={boardStats.overdue} sub={boardStats.overdue > 0 ? 'needs attention' : 'all on track'} icon={AlertCircle} color={boardStats.overdue > 0 ? 'text-red-600' : 'text-slate-400'} bg={boardStats.overdue > 0 ? 'bg-red-50/50' : 'bg-white'} />
            <StatCard label="Story Points" value={`${boardStats.donePoints}/${boardStats.points}`} sub="pts completed" icon={TrendingUp} color="text-indigo-600" bg="bg-indigo-50/50" />
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── MEMBER LIST ── */}
          <div className="w-[320px] shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">
            {/* Sort header */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{members.length} Members</p>
              <div className="flex items-center gap-1">
                {[['workload','Tasks'],['overdue','Overdue'],['progress','Progress']].map(([key, label]) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${sortBy === key ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* At-risk callout */}
              {atRiskMembers.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-red-500" />
                    <p className="text-xs font-black text-red-700">{atRiskMembers.length} member{atRiskMembers.length > 1 ? 's' : ''} at risk</p>
                  </div>
                  <div className="space-y-1">
                    {atRiskMembers.map(m => {
                      const s = getStats(m.cards);
                      return (
                        <button key={m._id} onClick={() => setSelectedMemberId(m._id)}
                          className="w-full flex items-center gap-2 text-left hover:bg-red-100 rounded-xl px-2 py-1 transition-colors">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ background: avatarColor(m.name) }}>{m.name?.[0]?.toUpperCase()}</div>
                          <span className="text-xs font-semibold text-red-700 flex-1 truncate">{m.name?.split(' ')[0]}</span>
                          <span className="text-[10px] font-bold text-red-500">{s.overdue} overdue</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedMembers.map(m => {
                const stats = getStats(m.cards);
                const health = getHealth(stats);
                const H = HEALTH[health];
                const isSelected = selectedMemberId === m._id;
                const barWidth = Math.round((m.cards.length / maxCards) * 100);
                return (
                  <button key={m._id} onClick={() => setSelectedMemberId(isSelected ? null : m._id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
                        style={{ background: avatarColor(m.name) }}>
                        {m.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 ${H.badge}`}>
                        <H.icon size={9} />
                        {stats.overdue > 0 ? `${stats.overdue} late` : H.label}
                      </span>
                    </div>

                    {/* Workload bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                        <span>Workload</span>
                        <span>{stats.done}/{stats.total} done</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, background: H.bar }} />
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      {[
                        { label: 'Assigned', value: stats.total, color: 'text-slate-700' },
                        { label: 'Done', value: stats.done, color: 'text-emerald-600' },
                        { label: 'Points', value: `${stats.donePoints}/${stats.points}`, color: 'text-indigo-600' },
                      ].map(x => (
                        <div key={x.label} className="bg-slate-50 rounded-xl py-1.5">
                          <p className={`text-sm font-black ${x.color}`}>{x.value}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{x.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Completion progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Completion</span>
                        <span className={`font-black ${stats.pct >= 80 ? 'text-emerald-600' : stats.pct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{stats.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${stats.pct}%`,
                            background: stats.pct >= 80 ? '#22c55e' : stats.pct >= 40 ? '#f59e0b' : '#ef4444',
                          }} />
                      </div>
                    </div>
                  </button>
                );
              })}

              {unassigned.length > 0 && (
                <button onClick={() => setSelectedMemberId(selectedMemberId === '__unassigned' ? null : '__unassigned')}
                  className={`w-full text-left p-3.5 rounded-2xl border border-dashed transition-all ${
                    selectedMemberId === '__unassigned' ? 'bg-slate-100 border-slate-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">Unassigned</p>
                      <p className="text-[10px] text-slate-400">{unassigned.length} issue{unassigned.length !== 1 ? 's' : ''} not assigned</p>
                    </div>
                  </div>
                </button>
              )}

              {members.length === 0 && (
                <div className="text-center py-12">
                  <Users size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No members assigned</p>
                  <p className="text-xs text-slate-300 mt-1">Assign team members to issues to see analytics</p>
                </div>
              )}
            </div>
          </div>

          {/* ── DETAIL PANEL ── */}
          <div className="flex-1 overflow-y-auto">
            {selectedMemberId === '__unassigned' ? (
              <UnassignedView cards={unassigned} />
            ) : selectedMember ? (
              <MemberDetail member={selectedMember} cards={selectedCards} activeSprint={activeSprint} />
            ) : (
              <BoardOverview cards={filteredCards} members={sortedMembers} />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── getStats helper ── */
function getStats(cards) {
  const total = cards.length;
  const done = cards.filter(c => c.progress >= 100).length;
  const overdue = cards.filter(c => isOverdue(c)).length;
  const points = cards.reduce((s, c) => s + (c.storyPoints || 0), 0);
  const donePoints = cards.filter(c => c.progress >= 100).reduce((s, c) => s + (c.storyPoints || 0), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, overdue, points, donePoints, pct };
}

/* ── Member Detail ── */
function MemberDetail({ member, cards, activeSprint }) {
  const stats = getStats(cards);
  const health = getHealth(stats);
  const H = HEALTH[health];

  const grouped = {
    overdue: cards.filter(c => isOverdue(c)).sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2)),
    in_progress: cards.filter(c => !isOverdue(c) && c.progress < 100).sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2)),
    done: cards.filter(c => c.progress >= 100),
  };

  const sprintCards = activeSprint ? cards.filter(c => (c.sprint?._id || c.sprint) === activeSprint._id) : [];

  return (
    <div className="p-6">
      {/* Member hero */}
      <div className="flex items-start gap-5 mb-6 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-md"
          style={{ background: `linear-gradient(135deg, ${avatarColor(member.name)}, ${avatarColor(member.name + '1')})` }}>
          {member.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-black text-slate-900">{member.name}</h3>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${H.badge}`}>
              <H.icon size={10} /> {H.label}
            </span>
          </div>
          <p className="text-sm text-slate-400">{member.email}</p>
          {activeSprint && sprintCards.length > 0 && (
            <p className="text-xs text-indigo-600 font-semibold mt-1.5">
              <Zap size={10} className="inline mr-1" />
              {sprintCards.length} issues in current sprint ({activeSprint.title})
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {[
            { label: 'Total',   value: stats.total, color: 'text-slate-800' },
            { label: 'Done',    value: stats.done,  color: 'text-emerald-600' },
            { label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-600' : 'text-slate-400' },
            { label: 'Points',  value: `${stats.donePoints}/${stats.points}`, color: 'text-indigo-600' },
          ].map(x => (
            <div key={x.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center min-w-[70px]">
              <p className={`text-xl font-black ${x.color}`}>{x.value}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{x.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Velocity bar */}
      <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Overall completion</p>
          <span className={`text-lg font-black ${stats.pct >= 80 ? 'text-emerald-600' : stats.pct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{stats.pct}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${stats.pct}%`,
              background: stats.pct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : stats.pct >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
            }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
          <span>0%</span>
          <span className="text-slate-300">|</span>
          <span>50%</span>
          <span className="text-slate-300">|</span>
          <span>100%</span>
        </div>
      </div>

      {/* Issue groups */}
      {Object.entries(grouped).map(([group, groupCards]) => {
        if (!groupCards.length) return null;
        const config = {
          overdue:     { label: 'Overdue',     color: 'bg-red-100 text-red-700 border-red-200',     dot: '#ef4444' },
          in_progress: { label: 'In Progress',  color: 'bg-blue-100 text-blue-700 border-blue-200',   dot: '#3b82f6' },
          done:        { label: 'Completed',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: '#22c55e' },
        }[group];
        return (
          <div key={group} className="mb-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3 text-xs font-black ${config.color}`}>
              <div className="w-2 h-2 rounded-full" style={{ background: config.dot }} />
              {config.label} · {groupCards.length}
            </div>
            <div className="space-y-2">
              {groupCards.map(c => <IssueRow key={c._id} card={c} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Board Overview (default panel) ── */
function BoardOverview({ cards, members }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...cards].sort((a, b) => {
    const aOv = isOverdue(a) ? 1 : 0;
    const bOv = isOverdue(b) ? 1 : 0;
    return bOv - aOv || (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2);
  });
  const visible = showAll ? sorted : sorted.slice(0, 15);

  // Sprint velocity bars
  const maxLoad = Math.max(...members.map(m => getStats(m.cards).total), 1);

  return (
    <div className="p-6">
      <p className="text-sm font-black text-slate-700 mb-4">
        Click a team member to see their individual dashboard
      </p>

      {/* Team workload chart */}
      {members.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Team Workload</p>
            <span className="text-[10px] text-slate-400">bars show relative task count</span>
          </div>
          <div className="space-y-3">
            {members.map(m => {
              const stats = getStats(m.cards);
              const health = getHealth(stats);
              const H = HEALTH[health];
              const barPct = Math.round((stats.total / maxLoad) * 100);
              return (
                <div key={m._id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                    style={{ background: avatarColor(m.name) }}>
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-20 truncate shrink-0">{m.name?.split(' ')[0]}</span>
                  <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 flex items-center"
                      style={{ width: `${barPct}%`, background: H.bar, minWidth: 4 }}>
                    </div>
                    <div className="absolute inset-0 flex items-center">
                      <div style={{ width: `${Math.round((stats.done / Math.max(stats.total,1)) * barPct)}%`, maxWidth: `${barPct}%` }}
                        className="h-full rounded-full bg-white/30 transition-all duration-700" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-slate-700 w-8 text-right">{stats.total}</span>
                    {stats.overdue > 0 && (
                      <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{stats.overdue}!</span>
                    )}
                    <span className={`text-[10px] font-black ${H.text} w-16 text-right`}>{stats.pct}% done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All issues */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">All Issues</p>
        <div className="space-y-1.5">
          {visible.map(c => <IssueRow key={c._id} card={c} showAssignees />)}
        </div>
        {sorted.length > 15 && (
          <button onClick={() => setShowAll(v => !v)}
            className="w-full mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
            {showAll ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {sorted.length} issues</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Unassigned View ── */
function UnassignedView({ cards }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle size={18} className="text-amber-500 shrink-0" />
        <div>
          <p className="font-bold text-amber-800">{cards.length} unassigned issue{cards.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-amber-600 mt-0.5">These issues have no assignees and may slip through the cracks</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {cards.map(c => <IssueRow key={c._id} card={c} />)}
      </div>
    </div>
  );
}

/* ── Issue Row ── */
const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const TYPE_ICONS = { bug: '🐛', feature: '✨', task: '☑️', improvement: '⚡', epic: '🚀' };

function IssueRow({ card, showAssignees }) {
  const overdue = isOverdue(card);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      overdue ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[card.priority] || '#eab308' }} />
      <span className="text-xs shrink-0">{TYPE_ICONS[card.cardType] || '☑️'}</span>
      <span className="text-[10px] font-mono text-slate-400 shrink-0">#{card._id.slice(-5).toUpperCase()}</span>
      <span className="text-sm text-slate-800 flex-1 truncate font-semibold">{card.title}</span>
      <span className="text-[10px] text-slate-400 shrink-0 hidden lg:block">{card.listTitle}</span>
      {card.dueDate && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
          overdue ? 'bg-red-100 text-red-700' : 'text-slate-400'
        }`}>
          {format(new Date(card.dueDate), 'MMM d')}
        </span>
      )}
      {showAssignees && card.assignees?.length > 0 && (
        <div className="flex -space-x-1.5 shrink-0">
          {card.assignees.slice(0, 2).map(a => (
            <div key={a._id} title={a.name}
              className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[8px] font-bold"
              style={{ background: avatarColor(a.name) }}>
              {a.name?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${card.progress || 0}%`,
            background: card.progress >= 100 ? '#22c55e' : '#6366f1',
          }} />
        </div>
        <span className={`text-[10px] font-black min-w-[28px] text-right ${card.progress >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
          {card.progress || 0}%
        </span>
      </div>
    </div>
  );
}
