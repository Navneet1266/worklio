import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch } from 'react-redux';
import { Paperclip, CheckSquare, Clock, AlignLeft, Layers, Hash, Flag } from 'lucide-react';
import { setActiveCard } from '../../store/slices/boardSlice';
import { format, isPast, isToday, differenceInDays } from 'date-fns';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

const PRIORITY = {
  urgent: { bar: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444', label: 'Urgent' },
  high:   { bar: '#f97316', bg: 'rgba(249,115,22,0.10)', dot: '#f97316', label: 'High'   },
  medium: { bar: '#eab308', bg: 'rgba(234,179,8,0.10)',  dot: '#eab308', label: 'Medium' },
  low:    { bar: '#22c55e', bg: 'rgba(34,197,94,0.10)',  dot: '#22c55e', label: 'Low'    },
};

const TYPE = {
  bug:         { bg: '#fef2f2', text: '#b91c1c', icon: '🐛', label: 'Bug' },
  feature:     { bg: '#f5f3ff', text: '#7c3aed', icon: '✨', label: 'Feature' },
  task:        { bg: '#eff6ff', text: '#1d4ed8', icon: '☑️', label: 'Task' },
  improvement: { bg: '#ecfeff', text: '#0e7490', icon: '⚡', label: 'Improvement' },
  epic:        { bg: '#fdf4ff', text: '#7e22ce', icon: '🚀', label: 'Epic' },
};

export default function Card({ card }) {
  const dispatch = useDispatch();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
  };

  const totalItems = card.checklists?.reduce((s, cl) => s + cl.items.length, 0) || 0;
  const doneItems  = card.checklists?.reduce((s, cl) => s + cl.items.filter(i => i.completed).length, 0) || 0;
  const progress   = card.progress || 0;

  const isDue    = !!card.dueDate;
  const dueObj   = isDue ? new Date(card.dueDate) : null;
  const duePast  = isDue && isPast(dueObj) && !isToday(dueObj);
  const dueToday = isDue && isToday(dueObj);
  const dueSoon  = isDue && !duePast && !dueToday && differenceInDays(dueObj, new Date()) <= 2;

  const priority = PRIORITY[card.priority] || PRIORITY.medium;
  const typeInfo = TYPE[card.cardType] || TYPE.task;
  const cardId   = card._id.slice(-5).toUpperCase();
  const isDone   = progress >= 100;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      onClick={() => dispatch(setActiveCard(card))}
      className="relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-150 hover:scale-[1.015] hover:-translate-y-0.5"
      style={{
        ...style,
        background: isDone ? 'rgba(240,253,244,0.97)' : 'rgba(255,255,255,0.97)',
        boxShadow: isDragging ? 'none' : '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
      }}>

      {/* Priority left stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3.5px]"
        style={{ background: priority.bar, borderRadius: '4px 0 0 4px' }} />

      {/* Cover strip */}
      {card.coverColor && (
        <div className="h-10 -mx-0 mb-0 rounded-t-2xl"
          style={{ background: card.coverColor, marginTop: 0 }} />
      )}

      {/* Card body */}
      <div className={`px-3.5 pb-3 pl-5 ${card.coverColor ? 'pt-2.5' : 'pt-3'}`}>

        {/* Top row: type + ID + priority dot */}
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: typeInfo.bg, color: typeInfo.text }}>
            <span className="text-[11px]">{typeInfo.icon}</span>
            {typeInfo.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono font-bold">{cardId}</span>
            <div className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
              style={{ background: priority.dot }} title={priority.label} />
          </div>
        </div>

        {/* Label pills */}
        {card.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.slice(0, 5).map((label, i) => (
              <div key={i} className="w-7 h-1.5 rounded-full" style={{ background: label.color }} />
            ))}
          </div>
        )}

        {/* Title */}
        <p className={`text-[13px] font-bold leading-snug mb-2.5 line-clamp-2 ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {card.title}
        </p>

        {/* Sprint / Backlog badge */}
        <div className="flex items-center gap-1 mb-2">
          {card.sprint?.title ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              <Layers size={8} /> {card.sprint.title}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              <Layers size={8} /> Backlog
            </span>
          )}
          {card.flagged && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Flag size={8} /> Blocked
            </span>
          )}
        </div>

        {/* Story points */}
        {card.storyPoints > 0 && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              <Hash size={9} /> {card.storyPoints} {card.storyPoints === 1 ? 'pt' : 'pts'}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="h-1.5 flex-1 rounded-full overflow-hidden mr-2"
                style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: isDone
                      ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                      : progress > 60
                      ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                      : 'linear-gradient(90deg,#f59e0b,#f97316)',
                  }} />
              </div>
              <span className={`text-[10px] font-black shrink-0 ${isDone ? 'text-emerald-600' : progress > 60 ? 'text-indigo-500' : 'text-amber-500'}`}>
                {progress}%
              </span>
            </div>
          </div>
        )}

        {/* Bottom meta row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDue && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                duePast  ? 'bg-red-100 text-red-700'
                : dueToday ? 'bg-amber-100 text-amber-700'
                : dueSoon  ? 'bg-orange-50 text-orange-600'
                : 'bg-slate-100 text-slate-500'
              }`}>
                <Clock size={9} />
                {format(dueObj, 'MMM d')}
              </span>
            )}
            {card.description && (
              <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center" title="Has description">
                <AlignLeft size={10} className="text-slate-400" />
              </div>
            )}
            {totalItems > 0 && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                doneItems === totalItems ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                <CheckSquare size={9} />
                {doneItems}/{totalItems}
              </span>
            )}
            {card.attachments?.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                <Paperclip size={9} />{card.attachments.length}
              </span>
            )}
          </div>

          {/* Assignees */}
          {card.assignees?.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {card.assignees.slice(0, 3).map(u => (
                <div key={u._id} title={u.name}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow-sm"
                  style={{ background: avatarColor(u.name) }}>
                  {u.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] text-slate-600 font-black">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Done checkmark overlay */}
      {isDone && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}
