import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import {
  X, Sun, RotateCcw, Calendar, Clock, CheckCircle2, ArrowRight,
  ChevronRight, Zap, Target, AlertTriangle, Sparkles, Coffee,
  CalendarCheck, MoreHorizontal, Flag, Inbox,
} from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, isPast, differenceInDays, addDays, startOfDay } from 'date-fns';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const PRIORITY_LABEL = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
const TYPE_ICON = { bug: '🐛', feature: '✨', task: '☑️', improvement: '⚡', epic: '🚀' };

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

function groupCards(cards) {
  const today = startOfDay(new Date());
  const rolledOver = [];
  const dueToday = [];
  const dueSoon = [];   // 1–6 days
  const noDueDate = [];

  for (const card of cards) {
    if (!card.dueDate) { noDueDate.push(card); continue; }
    const due = startOfDay(new Date(card.dueDate));
    const diff = differenceInDays(due, today);
    if (diff < 0)       rolledOver.push(card);   // overdue (was before today)
    else if (diff === 0) dueToday.push(card);
    else if (diff <= 6)  dueSoon.push(card);
    else                 noDueDate.push(card);    // far future — treat as inbox
  }
  return { rolledOver, dueToday, dueSoon, noDueDate };
}

const HOUR = new Date().getHours();
const GREETING = HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';

export default function MyDayPanel({ onClose }) {
  const { user } = useSelector(s => s.auth);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/cards/my-tasks');
        setCards(data);
      } catch {
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pushDate = async (card, days) => {
    setActionLoading(p => ({ ...p, [card._id]: true }));
    const newDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    try {
      await api.put(`/cards/${card._id}`, { dueDate: newDate });
      setCards(prev => prev.map(c => c._id === card._id ? { ...c, dueDate: new Date(newDate).toISOString() } : c));
      toast.success(days === 1 ? 'Moved to tomorrow' : `Moved to ${format(addDays(new Date(), days), 'EEE, MMM d')}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setActionLoading(p => ({ ...p, [card._id]: false }));
    }
  };

  const markDone = async card => {
    setActionLoading(p => ({ ...p, [card._id]: 'done' }));
    try {
      await api.put(`/cards/${card._id}`, { progress: 100 });
      setCards(prev => prev.filter(c => c._id !== card._id));
      toast.success('Marked as done! ✓');
    } catch {
      toast.error('Failed to update');
    } finally {
      setActionLoading(p => ({ ...p, [card._id]: false }));
    }
  };

  const { rolledOver, dueToday, dueSoon, noDueDate } = groupCards(cards);
  const todayCount = rolledOver.length + dueToday.length;

  const todayStr = format(new Date(), 'EEEE, MMMM d');

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-backdrop" />

      <div className="relative w-[480px] max-w-[96vw] h-full bg-white shadow-2xl flex flex-col animate-panel-in"
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-sm">
                <Sun size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">My Day</h2>
                <p className="text-xs text-slate-400">{todayStr}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Greeting banner */}
          <div className={`rounded-2xl p-4 ${
            todayCount === 0
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100'
              : rolledOver.length > 0
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100'
              : 'bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {todayCount === 0 ? <Sparkles size={15} className="text-emerald-500" /> : <Target size={15} className="text-indigo-500" />}
              <p className="text-sm font-black text-slate-800">{GREETING}, {user?.name?.split(' ')[0]}!</p>
            </div>
            {loading ? (
              <p className="text-xs text-slate-400">Loading your tasks…</p>
            ) : todayCount === 0 ? (
              <p className="text-xs text-emerald-700 font-medium">No tasks due today — you're all caught up! 🎉</p>
            ) : (
              <p className="text-xs text-slate-600">
                {todayCount} task{todayCount > 1 ? 's' : ''} need{todayCount === 1 ? 's' : ''} your attention today
                {rolledOver.length > 0 && <span className="text-amber-600 font-bold"> · {rolledOver.length} rolled over from before</span>}
              </p>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Rolled over section */}
              {rolledOver.length > 0 && (
                <Section
                  icon={RotateCcw}
                  title="Rolled Over"
                  count={rolledOver.length}
                  accent="amber"
                  subtitle="These were due before today"
                >
                  {rolledOver.map(card => (
                    <TaskCard key={card._id} card={card} variant="rolled-over"
                      onPushTomorrow={() => pushDate(card, 1)}
                      onPushDays={days => pushDate(card, days)}
                      onDone={() => markDone(card)}
                      loading={actionLoading[card._id]} />
                  ))}
                </Section>
              )}

              {/* Due today section */}
              {dueToday.length > 0 && (
                <Section
                  icon={Calendar}
                  title="Due Today"
                  count={dueToday.length}
                  accent="indigo"
                  subtitle="Focus on these to stay on track"
                >
                  {dueToday.map(card => (
                    <TaskCard key={card._id} card={card} variant="today"
                      onPushTomorrow={() => pushDate(card, 1)}
                      onPushDays={days => pushDate(card, days)}
                      onDone={() => markDone(card)}
                      loading={actionLoading[card._id]} />
                  ))}
                </Section>
              )}

              {/* All done state */}
              {!loading && todayCount === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck size={28} className="text-emerald-500" />
                  </div>
                  <p className="font-bold text-slate-700 text-base">All clear for today!</p>
                  <p className="text-sm text-slate-400 mt-1">Check upcoming tasks below to stay ahead</p>
                </div>
              )}

              {/* Due soon */}
              {dueSoon.length > 0 && (
                <Section
                  icon={Clock}
                  title="Coming Up"
                  count={dueSoon.length}
                  accent="slate"
                  subtitle="Due in the next 6 days"
                  collapsible
                >
                  {dueSoon.map(card => (
                    <TaskCard key={card._id} card={card} variant="soon"
                      onPushTomorrow={() => pushDate(card, 1)}
                      onPushDays={days => pushDate(card, days)}
                      onDone={() => markDone(card)}
                      loading={actionLoading[card._id]} />
                  ))}
                </Section>
              )}

              {/* No due date / Inbox */}
              {noDueDate.length > 0 && (
                <Section
                  icon={Inbox}
                  title="Inbox"
                  count={noDueDate.length}
                  accent="slate"
                  subtitle="Assigned to you — no due date set"
                  collapsible
                >
                  {noDueDate.map(card => (
                    <TaskCard key={card._id} card={card} variant="inbox"
                      onPushTomorrow={() => pushDate(card, 1)}
                      onPushDays={days => pushDate(card, days)}
                      onDone={() => markDone(card)}
                      loading={actionLoading[card._id]} />
                  ))}
                </Section>
              )}

              {cards.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Coffee size={28} className="text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-600">Nothing assigned to you</p>
                  <p className="text-sm text-slate-400 mt-1">Ask your team lead to assign some tasks</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && cards.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 px-6 py-3 bg-slate-50/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{cards.length} total assigned task{cards.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{cards.filter(c => c.progress >= 50).length} past halfway</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Section wrapper ── */
function Section({ icon: Icon, title, count, accent, subtitle, children, collapsible }) {
  const [collapsed, setCollapsed] = useState(false);

  const ACCENT = {
    amber: { header: 'text-amber-700 bg-amber-100 border-amber-200', icon: 'text-amber-500', dot: 'bg-amber-400', count: 'bg-amber-100 text-amber-700' },
    indigo: { header: 'text-indigo-700 bg-indigo-50 border-indigo-100', icon: 'text-indigo-500', dot: 'bg-indigo-400', count: 'bg-indigo-100 text-indigo-700' },
    slate: { header: 'text-slate-600 bg-slate-50 border-slate-200', icon: 'text-slate-400', dot: 'bg-slate-300', count: 'bg-slate-100 text-slate-600' },
  }[accent || 'slate'];

  return (
    <div className="space-y-2">
      <button
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border ${ACCENT.header} transition-colors`}
        onClick={() => collapsible && setCollapsed(v => !v)}>
        <div className={`w-6 h-6 rounded-xl flex items-center justify-center ${ACCENT.dot === 'bg-amber-400' ? 'bg-amber-100' : ACCENT.dot === 'bg-indigo-400' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
          <Icon size={13} className={ACCENT.icon} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-black">{title}</span>
          {subtitle && <span className="text-[10px] font-normal ml-2 opacity-70">{subtitle}</span>}
        </div>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${ACCENT.count}`}>{count}</span>
        {collapsible && (
          <ChevronRight size={13} className={`transition-transform ${collapsed ? '' : 'rotate-90'} ${ACCENT.icon}`} />
        )}
      </button>
      {!collapsed && <div className="space-y-2 pl-1">{children}</div>}
    </div>
  );
}

/* ── Task Card ── */
function TaskCard({ card, variant, onPushTomorrow, onPushDays, onDone, loading }) {
  const [showMore, setShowMore] = useState(false);

  const VARIANT_STYLE = {
    'rolled-over': 'border-amber-200 bg-amber-50/60 hover:border-amber-300',
    'today':       'border-indigo-200 bg-white hover:border-indigo-300 hover:shadow-sm',
    'soon':        'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
    'inbox':       'border-dashed border-slate-200 bg-white hover:border-slate-300',
  }[variant];

  const rolledOver = variant === 'rolled-over';
  const daysOverdue = card.dueDate
    ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(card.dueDate)))
    : 0;
  const daysUntil = card.dueDate
    ? differenceInDays(startOfDay(new Date(card.dueDate)), startOfDay(new Date()))
    : null;

  const dueLabelColor = rolledOver
    ? 'text-amber-600 bg-amber-100'
    : variant === 'today'
    ? 'text-indigo-600 bg-indigo-100'
    : 'text-slate-500 bg-slate-100';

  const dueLabelText = rolledOver
    ? daysOverdue === 1 ? 'Yesterday' : `${daysOverdue}d overdue`
    : variant === 'today'
    ? 'Today'
    : daysUntil !== null
    ? `In ${daysUntil}d`
    : null;

  return (
    <div className={`rounded-2xl border p-3.5 transition-all ${VARIANT_STYLE}`}>
      {/* Top row */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {/* Left indicator */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {rolledOver && (
            <div className="w-6 h-6 rounded-xl bg-amber-100 flex items-center justify-center" title="Rolled over from before">
              <RotateCcw size={11} className="text-amber-600" />
            </div>
          )}
          {variant === 'today' && (
            <div className="w-6 h-6 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Calendar size={11} className="text-indigo-600" />
            </div>
          )}
          {(variant === 'soon' || variant === 'inbox') && (
            <div className="w-6 h-6 rounded-xl bg-slate-100 flex items-center justify-center">
              <span className="text-[11px]">{TYPE_ICON[card.cardType] || '☑️'}</span>
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-snug ${rolledOver ? 'text-amber-900' : 'text-slate-800'} line-clamp-2`}>
            {card.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400">#{card._id.slice(-5).toUpperCase()}</span>
            {card.board?.title && (
              <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{card.board.title}</span>
            )}
            {card.sprint?.title && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                <Zap size={8} /> {card.sprint.title}
              </span>
            )}
          </div>
        </div>

        {/* Right side: priority + due */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[card.priority] || '#eab308' }} />
            <span className="text-[10px] font-bold text-slate-500">{PRIORITY_LABEL[card.priority] || 'Medium'}</span>
          </div>
          {dueLabelText && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dueLabelColor}`}>
              {dueLabelText}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {card.progress > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Progress</span>
            <span className="font-bold">{card.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${card.progress}%`, background: card.progress >= 75 ? '#22c55e' : '#6366f1' }} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-1">
        {/* Mark done */}
        <button onClick={onDone} disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 shrink-0">
          <CheckCircle2 size={12} />
          {loading === 'done' ? 'Saving…' : 'Done'}
        </button>

        {/* Push to tomorrow */}
        {!rolledOver && (
          <button onClick={onPushTomorrow} disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-60">
            <ArrowRight size={12} />
            Tomorrow
          </button>
        )}

        {/* If rolled over, offer "set to today" or "push further" */}
        {rolledOver && (
          <>
            <button onClick={() => onPushDays(0)}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors disabled:opacity-60">
              <Calendar size={12} />
              Today
            </button>
            <button onClick={onPushTomorrow}
              disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors disabled:opacity-60">
              <ArrowRight size={12} />
              Tomorrow
            </button>
          </>
        )}

        {/* More options */}
        <div className="relative ml-auto">
          <button onClick={() => setShowMore(v => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <MoreHorizontal size={14} />
          </button>
          {showMore && (
            <div className="absolute right-0 bottom-full mb-1 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
              {[3, 5, 7].map(d => (
                <button key={d} onClick={() => { onPushDays(d); setShowMore(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 text-left transition-colors">
                  <CalendarCheck size={11} className="text-slate-400" />
                  Push {d} days
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
