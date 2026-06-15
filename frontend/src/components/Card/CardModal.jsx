import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import {
  X, AlignLeft, Users, Clock, CheckSquare, Paperclip, Trash2,
  Zap, ChevronDown, Hash, GitFork, BarChart2, Calendar,
  FastForward, RotateCcw, Link2, Search, CalendarCheck,
  ChevronRight, MessageCircle, Plus, Flag, Copy, Eye, EyeOff,
  ArrowRight, Bookmark, ExternalLink, Activity, CheckCircle2,
  Star, Tag, MoreHorizontal, Pencil, Timer, TrendingUp,
} from 'lucide-react';
import { format, isPast, isToday, formatDistanceToNow, differenceInDays } from 'date-fns';
import { setActiveCard, updateCard, deleteCard, moveCardOptimistic } from '../../store/slices/boardSlice';
import { moveCardToSprint } from '../../store/slices/sprintSlice';
import CardComments from './CardComments';
import CardChecklist from './CardChecklist';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const LABEL_COLORS = [
  { color: '#22c55e', name: 'Green' }, { color: '#eab308', name: 'Yellow' },
  { color: '#f97316', name: 'Orange' }, { color: '#ef4444', name: 'Red' },
  { color: '#a855f7', name: 'Purple' }, { color: '#3b82f6', name: 'Blue' },
  { color: '#06b6d4', name: 'Cyan' },   { color: '#10b981', name: 'Teal' },
  { color: '#ec4899', name: 'Pink' },   { color: '#64748b', name: 'Slate' },
];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', icon: '🔴', dot: '#ef4444', from: '#fef2f2', to: '#fee2e2', ring: '#fca5a5', text: '#b91c1c', pill: 'bg-red-100 text-red-700',    border: 'border-red-300' },
  { value: 'high',   label: 'High',   icon: '🟠', dot: '#f97316', from: '#fff7ed', to: '#fed7aa', ring: '#fdba74', text: '#c2410c', pill: 'bg-orange-100 text-orange-700', border: 'border-orange-300' },
  { value: 'medium', label: 'Medium', icon: '🟡', dot: '#eab308', from: '#fefce8', to: '#fef08a', ring: '#fde047', text: '#a16207', pill: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-300' },
  { value: 'low',    label: 'Low',    icon: '🟢', dot: '#22c55e', from: '#f0fdf4', to: '#bbf7d0', ring: '#86efac', text: '#15803d', pill: 'bg-green-100 text-green-700',  border: 'border-green-300' },
];

const CARD_TYPES = [
  { value: 'task',        label: 'Task',        icon: '☑️', emoji: '☑️', bg: '#eff6ff', text: '#1d4ed8', heroFrom: '#2563eb', heroTo: '#4f46e5', glow: 'rgba(99,102,241,0.4)' },
  { value: 'bug',         label: 'Bug',         icon: '🐛', emoji: '🐛', bg: '#fef2f2', text: '#b91c1c', heroFrom: '#dc2626', heroTo: '#b91c1c', glow: 'rgba(239,68,68,0.4)' },
  { value: 'feature',     label: 'Feature',     icon: '✨', emoji: '✨', bg: '#f5f3ff', text: '#6d28d9', heroFrom: '#7c3aed', heroTo: '#4f46e5', glow: 'rgba(139,92,246,0.4)' },
  { value: 'improvement', label: 'Improvement', icon: '⚡', emoji: '⚡', bg: '#ecfeff', text: '#0e7490', heroFrom: '#0891b2', heroTo: '#0e7490', glow: 'rgba(6,182,212,0.4)' },
  { value: 'epic',        label: 'Epic',        icon: '🚀', emoji: '🚀', bg: '#faf5ff', text: '#7e22ce', heroFrom: '#6d28d9', heroTo: '#4c1d95', glow: 'rgba(124,58,237,0.4)' },
];

const AC = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = n => AC[n ? n.charCodeAt(0) % AC.length : 0];

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ progress, size = 56 }) {
  const filled = (progress / 100) * RING_C;
  const color = progress >= 100 ? '#22c55e' : progress > 50 ? '#6366f1' : '#f59e0b';
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={RING_R} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={RING_R} fill="none"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${filled} ${RING_C}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800"
        fill={progress >= 100 ? '#16a34a' : '#334155'}>
        {progress}%
      </text>
    </svg>
  );
}

export default function CardModal() {
  const dispatch = useDispatch();
  const { activeCard, board, lists } = useSelector(s => s.board);
  const { sprints } = useSelector(s => s.sprints);
  const { user } = useSelector(s => s.auth);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [progress, setProgress] = useState(0);
  const [depsSearch, setDepsSearch] = useState('');
  const [showDepsSearch, setShowDepsSearch] = useState(false);
  const [showMoveSprint, setShowMoveSprint] = useState(false);
  const [moveTargetSprintId, setMoveTargetSprintId] = useState('');
  const [moveComment, setMoveComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [watching, setWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [watchLoading, setWatchLoading] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);
  const [addingCL, setAddingCL] = useState(false);
  const [movingSprint, setMovingSprint] = useState(false);
  const [deletingAttachId, setDeletingAttachId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeCard) {
      setTitle(activeCard.title);
      setDescription(activeCard.description || '');
      setDueDate(activeCard.dueDate ? format(new Date(activeCard.dueDate), 'yyyy-MM-dd') : '');
      setStartDate(activeCard.startDate ? format(new Date(activeCard.startDate), 'yyyy-MM-dd') : '');
      setStoryPoints(activeCard.storyPoints ?? '');
      setProgress(activeCard.progress ?? 0);
      setEditingTitle(false); setEditingDesc(false);
      setShowMoveSprint(false); setOpenDropdown(null);
      setActiveTab('overview');
      const watchers = activeCard.watchers || [];
      setWatching(watchers.some(w => (w._id || w) === user?._id));
      setWatcherCount(watchers.length);
      setFlagged(activeCard.flagged || false);
    }
  }, [activeCard?._id]);

  if (!activeCard) return null;

  const currentList  = lists.find(l => l.cards.some(c => c._id === activeCard._id));
  const allBoardCards = lists.flatMap(l => l.cards).filter(c => c._id !== activeCard._id);
  const currentDepsIds = (activeCard.dependencies || []).map(d => d._id || d);
  const filteredCardSearch = depsSearch
    ? allBoardCards.filter(c => !currentDepsIds.includes(c._id) && c.title.toLowerCase().includes(depsSearch.toLowerCase())).slice(0, 6)
    : [];

  const cardSprintId  = activeCard.sprint?._id || activeCard.sprint;
  const cardSprintObj = sprints.find(s => s._id === cardSprintId);
  const typeInfo      = CARD_TYPES.find(t => t.value === activeCard.cardType) || CARD_TYPES[0];
  const priorityInfo  = PRIORITIES.find(p => p.value === activeCard.priority) || PRIORITIES[2];
  const isDue         = !!activeCard.dueDate;
  const dueDate_obj   = isDue ? new Date(activeCard.dueDate) : null;
  const duePast       = isDue && isPast(dueDate_obj) && !isToday(dueDate_obj);
  const dueSoon       = isDue && !duePast && differenceInDays(dueDate_obj, new Date()) <= 2;
  const cardId        = `TK-${activeCard._id.slice(-5).toUpperCase()}`;
  const boardMembers  = board?.members || [];
  const isAssignedToMe = activeCard.assignees?.some(a => a._id === user?._id);
  const totalItems = activeCard.checklists?.reduce((s, cl) => s + cl.items.length, 0) || 0;
  const doneItems  = activeCard.checklists?.reduce((s, cl) => s + cl.items.filter(i => i.completed).length, 0) || 0;
  const currentListIdx = lists.findIndex(l => l._id === currentList?._id);

  const close = () => { setOpenDropdown(null); dispatch(setActiveCard(null)); };
  const toggleDropdown = key => setOpenDropdown(p => p === key ? null : key);

  const handleToggleWatch = async () => {
    if (watchLoading) return;
    setWatchLoading(true);
    try {
      const { data } = await api.post(`/cards/${activeCard._id}/watch`);
      setWatching(data.watching);
      setWatcherCount(data.watchers.length);
      toast(data.watching ? '👁 Watching this card' : 'Stopped watching');
    } catch {
      toast.error('Failed to update watch status');
    } finally {
      setWatchLoading(false);
    }
  };

  const handleToggleFlagged = async () => {
    const next = !flagged;
    setFlagged(next);
    try {
      await dispatch(updateCard({ id: activeCard._id, flagged: next })).unwrap();
      toast(next ? '🚩 Marked as impediment' : 'Impediment flag removed');
    } catch {
      setFlagged(!next);
      toast.error('Failed to update flag');
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title.trim() !== activeCard.title)
      await dispatch(updateCard({ id: activeCard._id, title: title.trim() }));
  };
  const saveDesc = async () => {
    setEditingDesc(false);
    await dispatch(updateCard({ id: activeCard._id, description }));
  };
  const saveDueDate = async val => {
    setDueDate(val);
    await dispatch(updateCard({ id: activeCard._id, dueDate: val || null }));
  };
  const saveStartDate = async val => {
    setStartDate(val);
    await dispatch(updateCard({ id: activeCard._id, startDate: val || null }));
  };
  const saveProgress = async val => {
    const num = Math.min(100, Math.max(0, Number(val)));
    setProgress(num);
    await dispatch(updateCard({ id: activeCard._id, progress: num }));
  };
  const toggleLabel = async color => {
    const existing = activeCard.labels?.find(l => l.color === color);
    const labels = existing
      ? activeCard.labels.filter(l => l.color !== color)
      : [...(activeCard.labels || []), { color, text: '' }];
    await dispatch(updateCard({ id: activeCard._id, labels }));
  };
  const handleAssign = async member => {
    const isAssigned = activeCard.assignees?.some(a => a._id === member._id);
    try {
      if (isAssigned) await api.delete(`/cards/${activeCard._id}/assignees/${member._id}`);
      else await api.post(`/cards/${activeCard._id}/assignees`, { userId: member._id, email: member.email });
    } catch { toast.error('Failed to update assignees'); }
  };
  const handleAssignMe = async () => {
    const me = boardMembers.find(m => m._id === user?._id);
    if (me) await handleAssign(me);
  };
  const addDependency = async card => {
    await dispatch(updateCard({ id: activeCard._id, dependencies: [...currentDepsIds, card._id] }));
    setDepsSearch(''); setShowDepsSearch(false);
  };
  const removeDependency = async depId =>
    dispatch(updateCard({ id: activeCard._id, dependencies: currentDepsIds.filter(id => id !== depId) }));
  const handleMoveToList = async listId => {
    if (listId === currentList?._id) return;
    try {
      dispatch(moveCardOptimistic({ cardId: activeCard._id, sourceListId: currentList?._id, targetListId: listId, position: 0 }));
      await api.patch(`/boards/${board._id}/move-card`, { cardId: activeCard._id, sourceListId: currentList?._id, targetListId: listId, position: 0 });
      toast.success('Moved to ' + lists.find(l => l._id === listId)?.title);
    } catch { toast.error('Failed to move card'); }
  };
  const handleMoveToSprint = async () => {
    if (movingSprint) return;
    setMovingSprint(true);
    try {
      await dispatch(moveCardToSprint({ cardId: activeCard._id, targetSprintId: moveTargetSprintId || undefined, comment: moveComment || undefined })).unwrap();
      setShowMoveSprint(false); setMoveComment('');
      toast.success(moveTargetSprintId ? 'Moved to sprint' : 'Moved to backlog');
    } catch { toast.error('Failed to move to sprint'); }
    finally { setMovingSprint(false); }
  };
  const handleFileUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    setUploading(true);
    try { await api.post(`/uploads/card/${activeCard._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('File attached'); }
    catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };
  const handleDeleteAttachment = async id => {
    if (deletingAttachId) return;
    setDeletingAttachId(id);
    try { await api.delete(`/uploads/card/${activeCard._id}/${id}`); }
    catch { toast.error('Failed to remove attachment'); }
    finally { setDeletingAttachId(null); }
  };
  const handleDeleteCard = async () => {
    if (deletingCard || !confirm('Delete this issue? This cannot be undone.')) return;
    setDeletingCard(true);
    try {
      await dispatch(deleteCard({ id: activeCard._id, listId: currentList?._id }));
      close();
    } catch { toast.error('Failed to delete'); setDeletingCard(false); }
  };
  const handleAddChecklist = async e => {
    e.preventDefault(); if (!checklistTitle.trim() || addingCL) return;
    setAddingCL(true);
    try { await api.post(`/cards/${activeCard._id}/checklists`, { title: checklistTitle.trim() }); setChecklistTitle(''); setAddingChecklist(false); }
    catch { toast.error('Failed to add checklist'); }
    finally { setAddingCL(false); }
  };
  const copyIssueLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/board/${board?._id}?card=${activeCard._id}`);
    toast.success('Issue link copied');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" onClick={close}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[3px] animate-fade-backdrop" />

      <div className="relative w-[920px] max-w-[97vw] h-full flex flex-col animate-panel-in overflow-hidden"
        style={{ background: '#f8fafc' }}
        onClick={e => e.stopPropagation()}>

        {/* ══ HERO BANNER ══ */}
        <div className="relative shrink-0 overflow-hidden"
          style={{
            minHeight: 140,
            background: activeCard.coverColor
              ? activeCard.coverColor
              : `linear-gradient(135deg, ${typeInfo.heroFrom} 0%, ${typeInfo.heroTo} 100%)`,
          }}>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/25" />
          {/* Animated glow blob behind icon */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-60"
            style={{ background: typeInfo.glow }} />
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full border border-white/10" />
          <div className="absolute right-24 bottom-0 w-28 h-28 rounded-full bg-white/5" style={{ transform: 'translateY(40%)' }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '22px 22px' }} />

          <div className="relative flex items-center justify-between px-6 py-5 h-full">
            {/* Left: icon + type + id */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-4xl shadow-xl shrink-0">
                {typeInfo.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-white/90 text-xs font-black uppercase tracking-[0.12em]">{typeInfo.label}</span>
                  <span className="text-white/40 text-xs">·</span>
                  <span className="text-white/80 text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-lg">{cardId}</span>
                  {cardSprintObj && (
                    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/25">
                      <Zap size={10} /> {cardSprintObj.title}
                      {cardSprintObj.status === 'active' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Priority badge */}
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/25 backdrop-blur-sm">
                    <span className="text-[10px]">{priorityInfo.icon}</span>
                    {priorityInfo.label} priority
                  </span>
                  {activeCard.completedAt && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/80 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <CheckCircle2 size={11} /> Completed
                    </span>
                  )}
                  {flagged && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-500/80 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <Flag size={11} /> Impediment
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <HeroBtn onClick={copyIssueLink} title="Copy link"><Copy size={14} /></HeroBtn>
              <HeroBtn onClick={handleToggleWatch} active={watching} disabled={watchLoading} title={watching ? 'Stop watching' : 'Watch'}>
                {watching ? <Eye size={14} /> : <EyeOff size={14} />}
              </HeroBtn>
              <HeroBtn onClick={handleToggleFlagged} active={flagged} title="Flag as impediment">
                <Flag size={14} />
              </HeroBtn>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <HeroBtn onClick={close} title="Close"><X size={15} /></HeroBtn>
            </div>
          </div>
        </div>

        {/* ══ BREADCRUMB ══ */}
        <div className="shrink-0 flex items-center gap-1.5 px-6 py-2 bg-white border-b border-slate-200/60 shadow-sm">
          <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors">{board?.title}</span>
          <ChevronRight size={11} className="text-slate-300" />
          <span className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">{currentList?.title}</span>
          <ChevronRight size={11} className="text-slate-300" />
          <span className="text-xs font-mono font-bold text-slate-600">{cardId}</span>
        </div>

        {/* ══ PIPELINE STRIP ══ */}
        <div className="shrink-0 bg-white border-b border-slate-200/60 px-6 py-3">
          <div className="flex items-center gap-0 overflow-x-auto">
            {lists.map((list, i) => {
              const isCurrent = list._id === currentList?._id;
              const isPastStep = i < currentListIdx;
              const isFuture = i > currentListIdx;
              return (
                <div key={list._id} className="flex items-center shrink-0">
                  <button onClick={() => handleMoveToList(list._id)}
                    className={`relative flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'text-white shadow-md'
                        : isPastStep
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                    style={isCurrent ? { background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` } : {}}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isCurrent ? 'bg-white/25 text-white' : isPastStep ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isPastStep ? '✓' : i + 1}
                    </span>
                    {list.title}
                  </button>
                  {i < lists.length - 1 && (
                    <div className="flex items-center mx-1">
                      <div className={`h-0.5 w-6 ${i < currentListIdx ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT MAIN ── */}
          <div className="flex-1 min-w-0 overflow-y-auto bg-white"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

            {/* Title + quick-meta */}
            <div className="px-8 pt-6">
              {/* Title */}
              {editingTitle ? (
                <textarea value={title} onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } }}
                  className="w-full text-[22px] font-black text-slate-900 focus:outline-none resize-none bg-transparent leading-snug border-b-2 border-indigo-400 pb-1"
                  autoFocus rows={2} />
              ) : (
                <h1 onClick={() => setEditingTitle(true)}
                  className="text-[22px] font-black text-slate-900 leading-snug mb-2 cursor-pointer hover:bg-slate-50 rounded-2xl px-3 py-2 -mx-3 transition-colors group flex items-start gap-2">
                  <span className="flex-1">{activeCard.title}</span>
                  <Pencil size={14} className="text-slate-300 group-hover:text-slate-400 mt-1.5 shrink-0 transition-colors" />
                </h1>
              )}

              {/* Labels */}
              {activeCard.labels?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {activeCard.labels.map((label, i) => (
                    <span key={i} onClick={() => toggleDropdown('label')}
                      className="px-3 py-1 rounded-full text-white text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                      style={{ background: label.color }}>
                      {LABEL_COLORS.find(l => l.color === label.color)?.name || 'Label'}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick-meta chips row */}
              <div className="flex items-center gap-2 flex-wrap mb-5 pb-4 border-b border-slate-100">
                {/* Assignees */}
                {activeCard.assignees?.length > 0 ? (
                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => toggleDropdown('assignee')}>
                    <div className="flex -space-x-1.5">
                      {activeCard.assignees.slice(0, 3).map(a => (
                        <div key={a._id} title={a.name}
                          className="w-5 h-5 rounded-full border-2 border-white text-white flex items-center justify-center text-[8px] font-black shrink-0"
                          style={{ background: avatarColor(a.name) }}>
                          {a.name?.[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {activeCard.assignees.length === 1
                        ? activeCard.assignees[0].name?.split(' ')[0]
                        : `${activeCard.assignees.length} assignees`}
                    </span>
                  </div>
                ) : (
                  <button onClick={() => toggleDropdown('assignee')}
                    className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-semibold">
                    <Users size={12} /> Assign
                  </button>
                )}

                {/* Due date chip */}
                {dueDate ? (
                  <label className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border cursor-pointer transition-colors text-xs font-semibold ${
                    duePast ? 'bg-red-50 border-red-200 text-red-700' : dueSoon ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}>
                    <Clock size={12} />
                    {format(new Date(dueDate), 'MMM d')}
                    {duePast && <span className="text-[10px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}
                    <input type="date" value={dueDate} onChange={e => saveDueDate(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>
                ) : (
                  <label className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer text-xs font-semibold">
                    <Calendar size={12} /> Due date
                    <input type="date" value={dueDate} onChange={e => saveDueDate(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>
                )}

                {/* Sprint chip */}
                {cardSprintObj ? (
                  <div className="flex items-center gap-1.5 bg-indigo-50 rounded-xl px-3 py-1.5 border border-indigo-200 text-indigo-700 text-xs font-semibold cursor-pointer hover:bg-indigo-100 transition-colors"
                    onClick={() => toggleDropdown('sprint')}>
                    <Zap size={12} /> {cardSprintObj.title}
                  </div>
                ) : (
                  <button onClick={() => toggleDropdown('sprint')}
                    className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-xs font-semibold">
                    <Zap size={12} /> Sprint
                  </button>
                )}

                {/* Story points */}
                {storyPoints > 0 && (
                  <div className="flex items-center gap-1.5 bg-violet-50 rounded-xl px-3 py-1.5 border border-violet-200 text-violet-700 text-xs font-semibold">
                    <Hash size={12} /> {storyPoints} pts
                  </div>
                )}
              </div>

              {/* Progress card */}
              <div className="flex items-center gap-5 mb-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <ProgressRing progress={progress} size={56} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Progress</span>
                    <div className="flex items-center gap-1.5">
                      {totalItems > 0 && (
                        <span className="text-xs text-slate-400 font-semibold">{doneItems}/{totalItems} items</span>
                      )}
                      <span className={`text-xs font-black ${progress >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{progress}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden cursor-pointer relative group mb-2.5"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      saveProgress(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                    }}>
                    <div className="h-full rounded-full transition-all duration-500 relative"
                      style={{
                        width: `${progress}%`,
                        background: progress >= 100
                          ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                          : progress > 50
                          ? `linear-gradient(90deg,${typeInfo.heroFrom},${typeInfo.heroTo})`
                          : 'linear-gradient(90deg,#f59e0b,#f97316)',
                      }}>
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 25, 50, 75, 100].map(v => (
                      <button key={v} onClick={() => saveProgress(v)}
                        className={`flex-1 text-[10px] py-1 rounded-lg transition-all font-black ${
                          progress === v
                            ? 'text-white shadow-sm'
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 hover:text-slate-600'
                        }`}
                        style={progress === v ? { background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` } : {}}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs – pill style (sticky) */}
              <div className="flex items-center gap-1.5 sticky top-0 z-10 bg-white -mx-8 px-8 py-3 border-b border-slate-100 shadow-sm mb-0">
                {[
                  { key: 'overview', label: 'Overview', icon: AlignLeft },
                  { key: 'activity', label: 'Activity', icon: MessageCircle },
                  { key: 'history', label: 'Sprint History', icon: RotateCcw, badge: activeCard.sprintHistory?.length },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                      activeTab === tab.key
                        ? 'text-white shadow-md'
                        : 'text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                    style={activeTab === tab.key ? { background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` } : {}}>
                    <tab.icon size={12} />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="px-8 pb-10 pt-5">

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="space-y-5">

                  {/* Description */}
                  <Section icon={AlignLeft} title="Description">
                    {editingDesc ? (
                      <div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                          className="w-full p-4 border-2 border-indigo-300 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 resize-none min-h-[120px] leading-relaxed bg-indigo-50/20"
                          placeholder="Add a detailed description…" autoFocus />
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={saveDesc}
                            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white shadow-sm transition-opacity hover:opacity-90"
                            style={{ background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` }}>
                            Save
                          </button>
                          <button onClick={() => { setEditingDesc(false); setDescription(activeCard.description || ''); }}
                            className="text-xs font-bold px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditingDesc(true)}
                        className="min-h-[80px] p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/30 cursor-text text-sm text-slate-700 transition-colors border border-transparent hover:border-indigo-200 leading-relaxed whitespace-pre-wrap group">
                        {description
                          ? description
                          : <span className="text-slate-400 italic flex items-center gap-2">
                              <AlignLeft size={14} /> Click to add a description…
                            </span>}
                      </div>
                    )}
                  </Section>

                  {/* Checklists */}
                  {activeCard.checklists?.map(cl => (
                    <div key={cl._id}>
                      <CardChecklist checklist={cl} cardId={activeCard._id} />
                    </div>
                  ))}
                  {addingChecklist && (
                    <form onSubmit={handleAddChecklist} className="flex gap-2 items-center bg-indigo-50 rounded-2xl p-3.5 border border-indigo-200">
                      <CheckSquare size={15} className="text-indigo-400 shrink-0" />
                      <input value={checklistTitle} onChange={e => setChecklistTitle(e.target.value)}
                        placeholder="Checklist title…" className="input-field flex-1 text-sm" autoFocus
                        onKeyDown={e => e.key === 'Escape' && setAddingChecklist(false)} />
                      <button type="submit" disabled={addingCL}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` }}>
                        {addingCL ? '…' : 'Add'}
                      </button>
                      <button type="button" onClick={() => setAddingChecklist(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={14} /></button>
                    </form>
                  )}

                  {/* Linked issues */}
                  <Section icon={GitFork} title="Linked Issues" count={currentDepsIds.length}
                    action={
                      <button onClick={() => setShowDepsSearch(v => !v)}
                        className="text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200">
                        <Link2 size={11} /> Link issue
                      </button>
                    }>
                    {activeCard.dependencies?.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {activeCard.dependencies.map(dep => {
                          const depId = dep._id || dep;
                          const depTitle = dep.title || allBoardCards.find(c => c._id === depId)?.title || 'Unknown';
                          const t = CARD_TYPES.find(x => x.value === (dep.cardType || 'task')) || CARD_TYPES[0];
                          return (
                            <div key={depId} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 group hover:border-indigo-200 hover:shadow-sm transition-all">
                              <span className="text-base shrink-0">{t.emoji}</span>
                              <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">#{depId.slice(-5).toUpperCase()}</span>
                              <span className="text-sm text-slate-700 flex-1 truncate font-medium">{depTitle}</span>
                              <button onClick={() => removeDependency(depId)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded-lg transition-all"><X size={12} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {showDepsSearch && (
                      <div className="relative mb-2">
                        <div className="flex items-center gap-2 border-2 border-indigo-400 rounded-2xl px-3.5 py-2.5 bg-white shadow-sm">
                          <Search size={13} className="text-slate-400 shrink-0" />
                          <input value={depsSearch} onChange={e => setDepsSearch(e.target.value)}
                            placeholder="Search issues to link…" className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
                            autoFocus onKeyDown={e => e.key === 'Escape' && setShowDepsSearch(false)} />
                        </div>
                        {filteredCardSearch.length > 0 && (
                          <div className="absolute top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 max-h-52 overflow-y-auto">
                            {filteredCardSearch.map(c => {
                              const t = CARD_TYPES.find(x => x.value === c.cardType) || CARD_TYPES[0];
                              return (
                                <button key={c._id} onClick={() => addDependency(c)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                                  <span className="text-base">{t.emoji}</span>
                                  <span className="text-xs font-mono text-slate-400">#{c._id.slice(-5).toUpperCase()}</span>
                                  <span className="flex-1 truncate text-sm text-slate-700">{c.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {depsSearch && !filteredCardSearch.length && (
                          <p className="text-xs text-slate-400 mt-1.5 px-1">No matching issues found</p>
                        )}
                      </div>
                    )}
                    {!activeCard.dependencies?.length && !showDepsSearch && (
                      <p className="text-xs text-slate-400 italic py-2">No issues linked yet</p>
                    )}
                  </Section>

                  {/* Attachments */}
                  {activeCard.attachments?.length > 0 && (
                    <Section icon={Paperclip} title="Attachments" count={activeCard.attachments.length}>
                      <div className="grid grid-cols-2 gap-2">
                        {activeCard.attachments.map(att => {
                          const ext = att.originalName?.split('.').pop()?.toUpperCase() || 'FILE';
                          const isImg = /png|jpg|jpeg|gif|webp|svg/i.test(ext);
                          return (
                            <div key={att._id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 group hover:border-indigo-200 hover:shadow-sm transition-all">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[10px] font-black shrink-0 ${isImg ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                {ext.slice(0, 4)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <a href={att.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs font-bold text-indigo-600 hover:underline truncate block">{att.originalName}</a>
                                {att.size && <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(att.size / 1024)} KB</p>}
                              </div>
                              <button onClick={() => handleDeleteAttachment(att._id)} disabled={deletingAttachId === att._id}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={12} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {/* Move to sprint */}
                  {showMoveSprint && (
                    <div className="p-5 rounded-2xl border border-indigo-200 space-y-3"
                      style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' }}>
                      <p className="text-sm font-black text-indigo-800 flex items-center gap-2">
                        <FastForward size={14} /> Move to Sprint
                      </p>
                      <select value={moveTargetSprintId} onChange={e => setMoveTargetSprintId(e.target.value)}
                        className="w-full text-sm border border-indigo-200 bg-white rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500">
                        <option value="">Backlog (no sprint)</option>
                        {sprints.filter(s => s.status !== 'completed' && s._id !== cardSprintId).map(s => (
                          <option key={s._id} value={s._id}>{s.title}{s.status === 'active' ? ' · Active' : ''}</option>
                        ))}
                      </select>
                      <input value={moveComment} onChange={e => setMoveComment(e.target.value)}
                        placeholder="Reason / comment (optional)"
                        className="w-full text-sm border border-indigo-200 bg-white rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                        onKeyDown={e => e.key === 'Enter' && handleMoveToSprint()} />
                      <div className="flex gap-2">
                        <button onClick={handleMoveToSprint} disabled={movingSprint}
                          className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ background: `linear-gradient(135deg,${typeInfo.heroFrom},${typeInfo.heroTo})` }}>
                          {movingSprint ? 'Moving…' : 'Move'}</button>
                        <button onClick={() => { setShowMoveSprint(false); setMoveComment(''); }}
                          className="px-4 bg-white border border-indigo-200 text-indigo-700 text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVITY ── */}
              {activeTab === 'activity' && (
                <Section icon={MessageCircle} title="Comments & Activity">
                  <CardComments cardId={activeCard._id} boardId={board?._id} />
                </Section>
              )}

              {/* ── SPRINT HISTORY ── */}
              {activeTab === 'history' && (
                <Section icon={RotateCcw} title="Sprint History">
                  {activeCard.sprintHistory?.length > 0 ? (
                    <div className="relative pl-6">
                      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-300 to-slate-200 rounded-full" />
                      <div className="space-y-3">
                        {activeCard.sprintHistory.map((h, i) => (
                          <div key={i} className="relative flex items-start gap-4">
                            <div className="absolute -left-6 top-3 w-5 h-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center shadow-sm">
                              <Zap size={9} className="text-indigo-500" />
                            </div>
                            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-black text-sm text-slate-800">{h.sprintTitle}</span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {h.movedAt ? format(new Date(h.movedAt), 'MMM d, yyyy') : ''}
                                </span>
                              </div>
                              {h.comment && (
                                <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 rounded-xl px-3 py-2 border-l-2 border-indigo-300">"{h.comment}"</p>
                              )}
                              {h.movedBy && (
                                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                    {(typeof h.movedBy === 'object' ? h.movedBy.name : 'U')?.[0]?.toUpperCase()}
                                  </span>
                                  moved by <span className="font-bold text-slate-600">{typeof h.movedBy === 'object' ? h.movedBy.name : 'user'}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <RotateCcw size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No sprint history yet</p>
                      <p className="text-xs text-slate-400 mt-1">Sprint transitions will appear here</p>
                    </div>
                  )}
                </Section>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="w-[272px] shrink-0 border-l border-slate-200 overflow-y-auto flex flex-col min-h-0"
            style={{ background: '#f8fafc', scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

            {/* Sidebar gradient header */}
            <div className="h-1.5 w-full"
              style={{ background: `linear-gradient(90deg,${typeInfo.heroFrom},${typeInfo.heroTo})` }} />

            <div className="px-4 py-4 space-y-4">

              {/* ASSIGNEES */}
              <SbCard label="Assignees" icon={Users}>
                <div className="relative">
                  {activeCard.assignees?.length > 0 ? (
                    <div className="space-y-1.5 mb-2">
                      {activeCard.assignees.map(a => (
                        <button key={a._id} onClick={() => handleAssign(a)} title="Click to unassign"
                          className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors group">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm"
                            style={{ background: avatarColor(a.name) }}>
                            {a.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-700 group-hover:text-red-600 truncate">{a.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{a.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-2">Unassigned</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleDropdown('assignee')}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors">
                      <Plus size={11} /> Add member
                    </button>
                    {!isAssignedToMe && (
                      <button onClick={handleAssignMe}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200">
                        Assign me
                      </button>
                    )}
                  </div>
                  {openDropdown === 'assignee' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Assign member</DropHeader>
                      {boardMembers.map(m => {
                        const assigned = activeCard.assignees?.some(a => a._id === m._id);
                        return (
                          <DropItem key={m._id} onClick={() => handleAssign(m)} active={assigned}>
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: avatarColor(m.name) }}>{m.name?.[0]?.toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{m.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                            </div>
                          </DropItem>
                        );
                      })}
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* PRIORITY card */}
              <SbCard label="Priority" icon={Flag}>
                <div className="relative">
                  <button onClick={() => toggleDropdown('priority')}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all hover:shadow-sm"
                    style={{
                      background: `linear-gradient(135deg,${priorityInfo.from},${priorityInfo.to})`,
                      borderColor: priorityInfo.ring,
                    }}>
                    <span className="text-lg shrink-0">{priorityInfo.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black" style={{ color: priorityInfo.text }}>{priorityInfo.label}</p>
                      <p className="text-[10px] font-medium" style={{ color: priorityInfo.text, opacity: 0.7 }}>Priority level</p>
                    </div>
                    <ChevronDown size={13} className="shrink-0" style={{ color: priorityInfo.text, opacity: 0.5 }} />
                  </button>
                  {openDropdown === 'priority' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Priority</DropHeader>
                      {PRIORITIES.map(p => (
                        <DropItem key={p.value} onClick={() => { dispatch(updateCard({ id: activeCard._id, priority: p.value })); setOpenDropdown(null); }} active={activeCard.priority === p.value}>
                          <span className="text-base">{p.icon}</span>
                          <span className="font-semibold" style={{ color: p.text }}>{p.label}</span>
                        </DropItem>
                      ))}
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* TYPE */}
              <SbCard label="Issue Type">
                <div className="relative">
                  <SidebarBtn onClick={() => toggleDropdown('type')}>
                    <span className="text-base shrink-0">{typeInfo.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: typeInfo.text }}>{typeInfo.label}</span>
                    <ChevronDown size={12} className="ml-auto text-slate-400 shrink-0" />
                  </SidebarBtn>
                  {openDropdown === 'type' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Issue type</DropHeader>
                      {CARD_TYPES.map(t => (
                        <DropItem key={t.value} onClick={() => { dispatch(updateCard({ id: activeCard._id, cardType: t.value })); setOpenDropdown(null); }} active={activeCard.cardType === t.value}>
                          <span className="text-base">{t.emoji}</span>
                          <span className="font-semibold" style={{ color: t.text }}>{t.label}</span>
                        </DropItem>
                      ))}
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* SPRINT */}
              <SbCard label="Sprint" icon={Zap}>
                <div className="relative">
                  <SidebarBtn onClick={() => toggleDropdown('sprint')}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cardSprintObj?.status === 'active' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className={`text-sm font-bold ${cardSprintObj ? 'text-indigo-700' : 'text-slate-400'}`}>
                      {cardSprintObj ? cardSprintObj.title : 'Backlog'}
                    </span>
                    <ChevronDown size={12} className="ml-auto text-slate-400 shrink-0" />
                  </SidebarBtn>
                  {openDropdown === 'sprint' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Sprint</DropHeader>
                      <DropItem onClick={() => { dispatch(updateCard({ id: activeCard._id, sprint: null })); setOpenDropdown(null); }} active={!cardSprintId}>
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" /> Backlog
                      </DropItem>
                      {sprints.filter(s => s.status !== 'completed').map(s => (
                        <DropItem key={s._id} onClick={() => { dispatch(updateCard({ id: activeCard._id, sprint: s._id })); setOpenDropdown(null); }} active={cardSprintId === s._id}>
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status === 'active' ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                          {s.title}
                          {s.status === 'active' && <span className="ml-auto text-[10px] text-indigo-500 font-black">Active</span>}
                        </DropItem>
                      ))}
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* STORY POINTS */}
              <SbCard label="Story Points" icon={Hash}>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="200" value={storyPoints}
                    onChange={e => setStoryPoints(e.target.value)}
                    onBlur={() => dispatch(updateCard({ id: activeCard._id, storyPoints: storyPoints === '' ? null : Number(storyPoints) }))}
                    placeholder="Not estimated"
                    className="flex-1 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 placeholder:text-slate-400 placeholder:font-normal" />
                  {storyPoints > 0 && (
                    <span className="text-xs text-slate-400 shrink-0 font-semibold">pts</span>
                  )}
                </div>
              </SbCard>

              {/* DATES */}
              <SbCard label="Timeline" icon={Calendar}>
                <div className="space-y-2">
                  {/* Start */}
                  <label className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-indigo-300 transition-colors relative group">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Calendar size={13} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Start</p>
                      <p className="text-sm font-bold text-slate-700">{startDate ? format(new Date(startDate), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    {startDate && <button onClick={e => { e.preventDefault(); saveStartDate(''); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400"><X size={10} /></button>}
                    <input type="date" value={startDate} onChange={e => saveStartDate(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>

                  {/* Due */}
                  <label className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer border transition-colors relative group ${
                    duePast ? 'bg-red-50 border-red-200 hover:border-red-300' : dueSoon ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${duePast ? 'bg-red-100' : dueSoon ? 'bg-amber-100' : 'bg-slate-100'}`}>
                      <Clock size={13} className={duePast ? 'text-red-500' : dueSoon ? 'text-amber-500' : 'text-slate-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: duePast ? '#b91c1c' : dueSoon ? '#b45309' : '#94a3b8' }}>Due date</p>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-bold ${duePast ? 'text-red-700' : dueSoon ? 'text-amber-700' : 'text-slate-700'}`}>
                          {dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : '—'}
                        </p>
                        {duePast && <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}
                      </div>
                    </div>
                    {dueDate && <button onClick={e => { e.preventDefault(); saveDueDate(''); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400"><X size={10} /></button>}
                    <input type="date" value={dueDate} onChange={e => saveDueDate(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>

                  {activeCard.completedAt && (
                    <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <CalendarCheck size={13} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Completed</p>
                        <p className="text-sm font-bold text-emerald-700">{format(new Date(activeCard.completedAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </SbCard>

              {/* LABELS */}
              <SbCard label="Labels" icon={Tag}>
                <div className="relative">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {activeCard.labels?.map((label, i) => (
                      <button key={i} onClick={() => toggleDropdown('label')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold hover:opacity-80 transition-opacity shadow-sm"
                        style={{ background: label.color }}>
                        {LABEL_COLORS.find(l => l.color === label.color)?.name}
                      </button>
                    ))}
                    <button onClick={() => toggleDropdown('label')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-400 bg-slate-100 border border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                      <Plus size={10} /> Add label
                    </button>
                  </div>
                  {openDropdown === 'label' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Labels</DropHeader>
                      <div className="px-3 pb-3 grid grid-cols-5 gap-1.5">
                        {LABEL_COLORS.map(({ color, name }) => {
                          const active = activeCard.labels?.some(l => l.color === color);
                          return (
                            <button key={color} onClick={() => toggleLabel(color)} title={name}
                              className={`h-7 rounded-xl transition-all hover:scale-110 ${active ? 'ring-2 ring-offset-1 ring-slate-700 scale-110' : ''}`}
                              style={{ background: color }} />
                          );
                        })}
                      </div>
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* ACTIONS */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Actions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { icon: CheckSquare, label: 'Checklist', onClick: () => setAddingChecklist(v => !v) },
                    { icon: Paperclip,  label: uploading ? 'Uploading…' : 'Attach',
                      onClick: () => fileInputRef.current?.click(), disabled: uploading },
                    { icon: FastForward, label: 'Move Sprint',
                      onClick: () => { setShowMoveSprint(v => !v); setActiveTab('overview'); }, accent: true },
                    { icon: Eye, label: watching ? `Watching${watcherCount > 1 ? ` (${watcherCount})` : ''}` : `Watch${watcherCount > 0 ? ` (${watcherCount})` : ''}`,
                      onClick: handleToggleWatch, active: watching, disabled: watchLoading },
                    { icon: Flag, label: flagged ? 'Flagged' : 'Flag',
                      onClick: handleToggleFlagged, active: flagged },
                    { icon: Trash2, label: deletingCard ? 'Deleting…' : 'Delete', onClick: handleDeleteCard, danger: true, disabled: deletingCard },
                  ].map(({ icon: Icon, label, onClick, disabled, accent, danger, active }) => (
                    <button key={label} onClick={onClick} disabled={disabled}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all disabled:opacity-50 ${
                        danger ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' :
                        active || accent ? 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' :
                        'text-slate-600 bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}>
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>

              {/* COVER */}
              <SbCard label="Cover color">
                <div className="relative">
                  <SidebarBtn onClick={() => toggleDropdown('cover')}>
                    <div className="w-6 h-6 rounded-lg border border-slate-200 shrink-0" style={{ background: activeCard.coverColor || '#f1f5f9' }} />
                    <span className="text-sm text-slate-600 font-medium">{activeCard.coverColor ? 'Change cover' : 'Add cover'}</span>
                    <ChevronDown size={12} className="ml-auto text-slate-400 shrink-0" />
                  </SidebarBtn>
                  {openDropdown === 'cover' && (
                    <FloatMenu onClose={() => setOpenDropdown(null)}>
                      <DropHeader>Cover color</DropHeader>
                      <div className="px-3 pb-3">
                        <button onClick={() => { dispatch(updateCard({ id: activeCard._id, coverColor: '' })); setOpenDropdown(null); }}
                          className="w-full h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-500 mb-2 transition-colors">None</button>
                        <div className="grid grid-cols-5 gap-1.5">
                          {LABEL_COLORS.map(({ color }) => (
                            <button key={color} onClick={() => { dispatch(updateCard({ id: activeCard._id, coverColor: color })); setOpenDropdown(null); }}
                              className={`h-8 rounded-xl hover:scale-105 transition-all ${activeCard.coverColor === color ? 'ring-2 ring-offset-1 ring-slate-700' : ''}`}
                              style={{ background: color }} />
                          ))}
                        </div>
                      </div>
                    </FloatMenu>
                  )}
                </div>
              </SbCard>

              {/* CREATED BY */}
              {activeCard.createdBy && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Created by</p>
                  <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-3 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shrink-0 text-sm shadow-sm"
                      style={{ background: avatarColor(activeCard.createdBy?.name) }}>
                      {activeCard.createdBy?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{activeCard.createdBy?.name}</p>
                      {activeCard.createdAt && (
                        <p className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(activeCard.createdAt), { addSuffix: true })}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── helpers ── */

function HeroBtn({ onClick, title, active, disabled, children }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20 hover:text-white'
      }`}>
      {children}
    </button>
  );
}

function SbCard({ label, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={12} className="text-slate-400" />}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, count, action, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-slate-400" />}
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h4>
          {count > 0 && <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{count}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SidebarBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 text-sm bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl px-3 py-2.5 transition-colors text-left">
      {children}
    </button>
  );
}

function FloatMenu({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 50);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-scale-in overflow-hidden">
      {children}
    </div>
  );
}

function DropHeader({ children }) {
  return <p className="px-4 pt-1 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">{children}</p>;
}

function DropItem({ onClick, active, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${active ? 'text-indigo-700 font-bold bg-indigo-50/60' : 'text-slate-700'}`}>
      {children}
      {active && <span className="ml-auto text-indigo-500 text-xs font-black">✓</span>}
    </button>
  );
}
