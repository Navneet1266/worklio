import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Trash2, Plus, GripVertical } from 'lucide-react';
import { updateList, deleteList } from '../../store/slices/boardSlice';
import Card from './Card';
import AddCard from './AddCard';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  todo:      { color: '#94a3b8', label: 'To Do' },
  backlog:   { color: '#94a3b8', label: 'Backlog' },
  progress:  { color: '#3b82f6', label: 'In Progress' },
  doing:     { color: '#3b82f6', label: 'In Progress' },
  inprogress:{ color: '#3b82f6', label: 'In Progress' },
  review:    { color: '#f59e0b', label: 'In Review' },
  testing:   { color: '#f59e0b', label: 'Testing' },
  blocked:   { color: '#ef4444', label: 'Blocked' },
  done:      { color: '#22c55e', label: 'Done' },
  completed: { color: '#22c55e', label: 'Completed' },
};

function getStatus(title) {
  const key = title.toLowerCase().replace(/[\s_-]+/g, '');
  for (const [word, info] of Object.entries(STATUS_MAP)) {
    if (key.includes(word)) return info;
  }
  return { color: '#a78bfa', label: title };
}

export default function List({ list, boardId }) {
  const dispatch = useDispatch();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const titleRef = useRef(null);
  const menuRef  = useRef(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list._id,
    data: { type: 'list', list },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    width: 292,
    minWidth: 292,
  };

  const status     = getStatus(list.title);
  const doneCount  = list.cards.filter(c => c.progress >= 100).length;
  const donePct    = list.cards.length > 0 ? Math.round((doneCount / list.cards.length) * 100) : 0;

  useEffect(() => { if (editingTitle) titleRef.current?.select(); }, [editingTitle]);
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const saveTitleEdit = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== list.title) {
      try { await dispatch(updateList({ id: list._id, title: title.trim() })).unwrap(); }
      catch { setTitle(list.title); toast.error('Failed to update list'); }
    } else { setTitle(list.title); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete list "${list.title}"?`)) return;
    setShowMenu(false);
    try { await dispatch(deleteList(list._id)).unwrap(); toast.success('List deleted'); }
    catch { toast.error('Failed to delete list'); }
  };

  const sortedCards = list.cards.slice().sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map(c => c._id);

  return (
    <div ref={setNodeRef}
      className="flex-shrink-0 flex flex-col rounded-3xl mx-2 overflow-hidden"
      style={{
        ...style,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      }}>

      {/* Top status accent line */}
      <div className="h-1.5 w-full shrink-0" style={{ background: status.color }} />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 cursor-grab active:cursor-grabbing select-none"
        style={{ background: 'rgba(255,255,255,0.6)' }}
        {...attributes} {...listeners}>

        {/* Status dot + title */}
        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: status.color }} />

        {editingTitle ? (
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitleEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitleEdit();
              if (e.key === 'Escape') { setTitle(list.title); setEditingTitle(false); }
            }}
            className="flex-1 px-2.5 py-1 bg-white border border-indigo-300 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
            onClick={e => e.stopPropagation()} />
        ) : (
          <h3 onClick={e => { e.stopPropagation(); setEditingTitle(true); }}
            className="flex-1 text-xs font-black text-slate-600 uppercase tracking-wider truncate cursor-text hover:text-slate-900 transition-colors">
            {list.title}
          </h3>
        )}

        {/* Card count */}
        <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0 min-w-[1.75rem] text-center shadow-sm">
          {list.cards.length}
        </span>

        {/* Menu */}
        <div className="relative shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(v => !v)}
            className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-scale-in">
              <button onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                <Trash2 size={13} /> Delete list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {list.cards.length > 0 && (
        <div className="mx-4 mb-2 h-1 rounded-full overflow-hidden bg-slate-200/70">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${donePct}%`, background: status.color }} />
        </div>
      )}

      {/* Cards scroll area */}
      <div className="flex-1 overflow-y-auto px-2 pb-1 space-y-2"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.15) transparent',
        }}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card, i) => (
            <Card key={card._id} card={card} listId={list._id} index={i} />
          ))}
        </SortableContext>
        {sortedCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-300">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-2">
              <Plus size={18} />
            </div>
            <p className="text-xs font-medium text-slate-400">No issues yet</p>
          </div>
        )}
      </div>

      {/* Add card */}
      <AddCard listId={list._id} boardId={boardId} />
    </div>
  );
}
