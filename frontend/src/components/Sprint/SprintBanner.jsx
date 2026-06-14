import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { differenceInDays, format, isPast } from 'date-fns';
import { Zap, Calendar, TrendingUp, ChevronRight } from 'lucide-react';

export default function SprintBanner({ onManage }) {
  const { sprints } = useSelector((s) => s.sprints);
  const { lists } = useSelector((s) => s.board);

  const activeSprint = useMemo(() => sprints.find((s) => s.status === 'active'), [sprints]);

  const stats = useMemo(() => {
    if (!activeSprint) return null;
    const allCards = lists.flatMap((l) => l.cards);
    const sprintCards = allCards.filter(
      (c) => c.sprint?._id === activeSprint._id || c.sprint === activeSprint._id
    );
    const done = sprintCards.filter((c) => c.progress >= 100).length;
    const totalPoints = sprintCards.reduce((s, c) => s + (c.storyPoints || 0), 0);
    const donePoints = sprintCards.filter((c) => c.progress >= 100).reduce((s, c) => s + (c.storyPoints || 0), 0);
    return { total: sprintCards.length, done, totalPoints, donePoints };
  }, [activeSprint, lists]);

  if (!activeSprint) return null;

  const pct = stats?.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const daysLeft = activeSprint.endDate
    ? differenceInDays(new Date(activeSprint.endDate), new Date())
    : null;
  const overdue = daysLeft !== null && daysLeft < 0;

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-5 py-2 border-b border-white/10 text-white"
      style={{ background: 'rgba(99,102,241,0.25)', backdropFilter: 'blur(6px)' }}
    >
      {/* Sprint name */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded-md bg-indigo-500/80 flex items-center justify-center">
          <Zap size={11} fill="white" className="text-white" />
        </div>
        <span className="text-sm font-semibold text-white/90">{activeSprint.title}</span>
        {activeSprint.goal && (
          <span className="hidden lg:block text-xs text-white/50 max-w-[200px] truncate">
            · {activeSprint.goal}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-white/20 shrink-0" />

      {/* Progress */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? '#22c55e' : '#818cf8',
            }}
          />
        </div>
        <span className="text-xs font-semibold text-white/70 shrink-0">
          {stats?.done}/{stats?.total} done
        </span>
      </div>

      {/* Points */}
      {stats?.totalPoints > 0 && (
        <>
          <div className="h-4 w-px bg-white/20 shrink-0 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1 text-xs text-white/60">
            <TrendingUp size={11} />
            {stats.donePoints}/{stats.totalPoints} pts
          </div>
        </>
      )}

      {/* Dates */}
      {activeSprint.endDate && (
        <>
          <div className="h-4 w-px bg-white/20 shrink-0 hidden md:block" />
          <div className={`hidden md:flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-300' : 'text-white/60'}`}>
            <Calendar size={11} />
            {overdue
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft === 0
              ? 'Due today'
              : `${daysLeft}d left`}
            <span className="text-white/40">
              · ends {format(new Date(activeSprint.endDate), 'MMM d')}
            </span>
          </div>
        </>
      )}

      <div className="flex-1" />

      <button
        onClick={onManage}
        className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10 shrink-0"
      >
        Manage sprints <ChevronRight size={12} />
      </button>
    </div>
  );
}
