import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  ChevronDown, Plus, Check, Layers, Zap,
} from 'lucide-react';
import { createCard, setActiveCard } from '../../store/slices/boardSlice';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

const STATUS_CONFIG = {
  planning:  { dot: '#94a3b8', label: 'Planning',  header: 'bg-slate-700' },
  active:    { dot: '#6366f1', label: 'Active',    header: 'bg-indigo-700' },
  completed: { dot: '#22c55e', label: 'Completed', header: 'bg-slate-800' },
};

export default function BacklogView({ boardId }) {
  const dispatch = useDispatch();
  const { lists } = useSelector(s => s.board);
  const { sprints } = useSelector(s => s.sprints);

  const [collapsed, setCollapsed] = useState({});
  const [addingTo, setAddingTo]   = useState(null);
  const [newTitle, setNewTitle]   = useState('');
  const [creating, setCreating]   = useState(false);

  const firstListId = lists[0]?._id;

  const allCards = useMemo(
    () => lists.flatMap(l => l.cards.map(c => ({ ...c, listName: l.title }))),
    [lists],
  );

  const sortedSprints = useMemo(
    () => [...sprints].sort((a, b) => {
      const o = { active: 0, planning: 1, completed: 2 };
      return (o[a.status] ?? 1) - (o[b.status] ?? 1);
    }),
    [sprints],
  );

  const cardsForSprint = id =>
    allCards.filter(c => c.sprint?._id === id || c.sprint === id);

  const backlogCards = allCards.filter(c => !c.sprint);

  const toggleCollapse = key =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const openAdd = key => { setAddingTo(key); setNewTitle(''); };

  const handleAdd = async (sprintId) => {
    if (!newTitle.trim()) { setAddingTo(null); return; }
    if (!firstListId) { toast.error('Add at least one list to the board first'); return; }
    setCreating(true);
    try {
      await dispatch(createCard({
        title: newTitle.trim(),
        listId: firstListId,
        boardId,
        sprint: sprintId || undefined,
      })).unwrap();
      setNewTitle('');
    } catch (e) {
      toast.error(e || 'Failed to create story');
    } finally {
      setCreating(false);
    }
  };

  const CardRow = ({ card }) => {
    const done       = card.progress >= 100;
    const inProgress = card.progress > 0 && !done;
    const overdue    = card.dueDate && new Date(card.dueDate) < new Date() && !done;

    return (
      <div
        onClick={() => dispatch(setActiveCard(card))}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/60 cursor-pointer border-t border-slate-100 group transition-colors"
      >
        {/* Status circle */}
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
          ${done        ? 'bg-emerald-500 border-emerald-500'
          : inProgress  ? 'border-indigo-500 bg-indigo-50'
          :               'border-slate-300 bg-white'}`}>
          {done       && <Check size={8} className="text-white" strokeWidth={3} />}
          {inProgress && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
        </div>

        {/* Title */}
        <span className={`flex-1 text-sm font-medium truncate
          ${done ? 'line-through text-slate-400' : 'text-slate-800 group-hover:text-indigo-700'}`}>
          {card.title}
        </span>

        {/* List badge */}
        <span className="hidden sm:block text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
          {card.listName}
        </span>

        {/* Priority dot */}
        {card.priority && (
          <div className="w-2 h-2 rounded-full shrink-0" title={card.priority}
            style={{ background: PRIORITY_COLOR[card.priority] || '#94a3b8' }} />
        )}

        {/* Story points */}
        {card.storyPoints != null && card.storyPoints > 0 && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {card.storyPoints}pt
          </span>
        )}

        {/* Due date */}
        {card.dueDate && (
          <span className={`hidden md:block text-[11px] px-2 py-0.5 rounded-full shrink-0
            ${overdue ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-100'}`}>
            {format(new Date(card.dueDate), 'MMM d')}
          </span>
        )}

        {/* Assignees */}
        {card.assignees?.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {card.assignees.slice(0, 3).map(a => (
              <div key={a._id} title={a.name}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow-sm"
                style={{ background: avatarColor(a.name) }}>
                {a.name?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const AddRow = ({ sectionKey, sprintId }) => (
    addingTo === sectionKey ? (
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-white">
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-indigo-300 shrink-0" />
        <input
          autoFocus
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter')  handleAdd(sprintId);
            if (e.key === 'Escape') { setAddingTo(null); setNewTitle(''); }
          }}
          placeholder="Story title…"
          className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          disabled={creating}
        />
        <button onClick={() => handleAdd(sprintId)} disabled={creating || !newTitle.trim()}
          className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
          Add
        </button>
        <button onClick={() => { setAddingTo(null); setNewTitle(''); }}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    ) : (
      <button onClick={() => openAdd(sectionKey)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 border-t border-slate-100 transition-colors">
        <Plus size={13} /> Add story
      </button>
    )
  );

  const Section = ({ sectionKey, title, cards, sprint }) => {
    const cfg      = sprint ? STATUS_CONFIG[sprint.status] : null;
    const done     = cards.filter(c => c.progress >= 100).length;
    const points   = cards.reduce((s, c) => s + (c.storyPoints || 0), 0);
    const pct      = cards.length ? Math.round((done / cards.length) * 100) : 0;
    const isOpen   = !collapsed[sectionKey];
    const isActive = sprint?.status === 'active';

    return (
      <div className="mb-3 rounded-2xl overflow-hidden shadow-sm border border-white/10">
        {/* Header */}
        <div
          onClick={() => toggleCollapse(sectionKey)}
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none
            ${cfg ? cfg.header : 'bg-slate-700'}`}
        >
          {cfg
            ? <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
            : <Layers size={13} className="text-white/60 shrink-0" />
          }

          <span className="text-white font-bold text-sm flex-1 truncate">{title}</span>

          {cards.length > 0 && (
            <span className="text-white/60 text-xs shrink-0">
              {done}/{cards.length}
              {points > 0 && <span className="ml-2">{points}pt</span>}
            </span>
          )}

          {sprint && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0
              ${isActive ? 'bg-indigo-400/30 text-indigo-200'
              : sprint.status === 'planning' ? 'bg-slate-600/50 text-slate-300'
              : 'bg-emerald-800/40 text-emerald-300'}`}>
              {cfg.label}
            </span>
          )}

          <ChevronDown size={14} className={`text-white/50 transition-transform shrink-0
            ${isOpen ? '' : '-rotate-90'}`} />
        </div>

        {/* Progress bar (sprints only) */}
        {sprint && cards.length > 0 && (
          <div className="h-0.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full transition-all"
              style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#6366f1' }} />
          </div>
        )}

        {/* Body */}
        {isOpen && (
          <div className="bg-white">
            {cards.length === 0 && (
              <div className="px-4 py-4 text-sm text-slate-400 italic">
                No stories yet — add one below
              </div>
            )}
            {cards.map(c => <CardRow key={c._id} card={c} />)}
            <AddRow sectionKey={sectionKey} sprintId={sprint?._id || null} />
          </div>
        )}
      </div>
    );
  };

  const sprintTitle = s => {
    let t = s.title;
    if (s.startDate) t += ` · ${format(new Date(s.startDate), 'MMM d')}`;
    if (s.endDate)   t += ` – ${format(new Date(s.endDate), 'MMM d')}`;
    return t;
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'rgba(0,0,0,0.12)' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-white/70" />
          <h2 className="text-white font-black text-base tracking-tight">Backlog</h2>
          <span className="text-white/40 text-sm">{allCards.length} issues across {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</span>
        </div>

        {/* No lists guard */}
        {lists.length === 0 && (
          <div className="text-center py-10 text-white/50 text-sm">
            Add at least one list to the board before creating stories.
          </div>
        )}

        {/* Sprint sections */}
        {sortedSprints.map(s => (
          <Section
            key={s._id}
            sectionKey={s._id}
            title={sprintTitle(s)}
            cards={cardsForSprint(s._id)}
            sprint={s}
          />
        ))}

        {/* No sprints nudge */}
        {sprints.length === 0 && (
          <div className="text-center py-5 mb-3 text-white/40 text-sm">
            No sprints yet — create one from the <strong className="text-white/60">⚡ Sprints</strong> button in the toolbar
          </div>
        )}

        {/* Backlog section */}
        <Section
          key="backlog"
          sectionKey="backlog"
          title={`Backlog (${backlogCards.length})`}
          cards={backlogCards}
          sprint={null}
        />
      </div>
    </div>
  );
}
