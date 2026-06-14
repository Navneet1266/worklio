import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  X, Plus, Play, CheckCircle2, Trash2, Edit3, Zap, AlertCircle, Clock,
  ChevronDown, ChevronUp, Flag,
} from 'lucide-react';
import {
  createSprint, updateSprint, startSprint, completeSprint, deleteSprint,
} from '../../store/slices/sprintSlice';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  planning: { label: 'Planning', bg: 'bg-slate-100', text: 'text-slate-600', dot: '#94a3b8' },
  active:   { label: 'Active',   bg: 'bg-indigo-100', text: 'text-indigo-700', dot: '#6366f1' },
  completed:{ label: 'Completed',bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#22c55e' },
};

export default function SprintManager({ boardId, onClose }) {
  const dispatch = useDispatch();
  const { sprints } = useSelector((s) => s.sprints);
  const { lists } = useSelector((s) => s.board);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [completingId, setCompletingId] = useState(null);
  const [completeNextSprint, setCompleteNextSprint] = useState('');
  const [completeComment, setCompleteComment] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const activeSprint = useMemo(() => sprints.find((s) => s.status === 'active'), [sprints]);

  const sprintStats = useMemo(() => {
    const allCards = lists.flatMap((l) => l.cards);
    const map = {};
    for (const s of sprints) {
      const sc = allCards.filter(
        (c) => c.sprint?._id === s._id || c.sprint === s._id
      );
      map[s._id] = {
        total: sc.length,
        done: sc.filter((c) => c.progress >= 100).length,
        points: sc.reduce((a, c) => a + (c.storyPoints || 0), 0),
      };
    }
    return map;
  }, [sprints, lists]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return toast.error('Sprint name required');
    try {
      await dispatch(createSprint({
        boardId,
        title: newTitle.trim(),
        goal: newGoal,
        startDate: newStart || null,
        endDate: newEnd || null,
      })).unwrap();
      setNewTitle(''); setNewGoal(''); setNewStart(''); setNewEnd('');
      setShowCreate(false);
      toast.success('Sprint created');
    } catch (e) {
      toast.error(e || 'Failed to create sprint');
    }
  };

  const handleStart = async (id) => {
    try {
      await dispatch(startSprint(id)).unwrap();
      toast.success('Sprint started!');
    } catch (e) {
      toast.error(e || 'Failed to start sprint');
    }
  };

  const handleComplete = async (id) => {
    const stats = sprintStats[id] || {};
    const incomplete = (stats.total || 0) - (stats.done || 0);
    try {
      await dispatch(completeSprint({
        id,
        nextSprintId: completeNextSprint || undefined,
        comment: completeComment || undefined,
      })).unwrap();
      toast.success(`Sprint completed! ${incomplete > 0 ? `${incomplete} issue${incomplete > 1 ? 's' : ''} moved.` : 'All issues done!'}`);
      setCompletingId(null);
      setCompleteNextSprint('');
      setCompleteComment('');
    } catch (e) {
      toast.error(e || 'Failed to complete sprint');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sprint? Cards will be unassigned from it.')) return;
    try {
      await dispatch(deleteSprint(id)).unwrap();
      toast.success('Sprint deleted');
    } catch (e) {
      toast.error(e || 'Failed to delete sprint');
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await dispatch(updateSprint({ id, ...editData })).unwrap();
      setEditingId(null);
    } catch (e) {
      toast.error(e || 'Failed to update sprint');
    }
  };

  const sorted = [...sprints].sort((a, b) => {
    const order = { active: 0, planning: 1, completed: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sprint Manager</h2>
              <p className="text-xs text-slate-400">{sprints.length} sprints · {activeSprint ? `${activeSprint.title} active` : 'No active sprint'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sorted.map((sprint) => {
            const style = STATUS_STYLE[sprint.status];
            const stats = sprintStats[sprint._id] || { total: 0, done: 0, points: 0 };
            const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
            const isExpanded = expandedId === sprint._id;
            const isEditing = editingId === sprint._id;
            const isCompleting = completingId === sprint._id;
            const incomplete = stats.total - stats.done;

            return (
              <div key={sprint._id}
                className={`rounded-2xl border ${sprint.status === 'active' ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
                {/* Sprint row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: style.dot }} />

                  {isEditing ? (
                    <input value={editData.title || ''} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                      className="flex-1 text-sm font-semibold text-slate-800 border border-indigo-400 rounded-lg px-2 py-0.5 outline-none"
                      autoFocus />
                  ) : (
                    <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{sprint.title}</span>
                  )}

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} shrink-0`}>
                    {style.label}
                  </span>

                  <span className="text-xs text-slate-400 shrink-0">{stats.done}/{stats.total}</span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {sprint.status === 'planning' && (
                      <button onClick={() => handleStart(sprint._id)}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-2.5 py-1 rounded-lg transition-colors">
                        <Play size={11} /> Start
                      </button>
                    )}
                    {sprint.status === 'active' && (
                      <button onClick={() => setCompletingId(isCompleting ? null : sprint._id)}
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-2.5 py-1 rounded-lg transition-colors">
                        <CheckCircle2 size={11} /> Complete
                      </button>
                    )}
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(sprint._id)}
                          className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-slate-400 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingId(sprint._id); setEditData({ title: sprint.title, goal: sprint.goal, startDate: sprint.startDate?.slice(0,10) || '', endDate: sprint.endDate?.slice(0,10) || '' }); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit3 size={13} />
                      </button>
                    )}
                    {sprint.status !== 'active' && (
                      <button onClick={() => handleDelete(sprint._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : sprint._id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {stats.total > 0 && (
                  <div className="px-4 pb-2">
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#6366f1' }} />
                    </div>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100 space-y-2">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1">Goal</label>
                          <input value={editData.goal || ''} onChange={e => setEditData(d => ({ ...d, goal: e.target.value }))}
                            placeholder="Sprint goal…"
                            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Start</label>
                            <input type="date" value={editData.startDate || ''} onChange={e => setEditData(d => ({ ...d, startDate: e.target.value }))}
                              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">End</label>
                            <input type="date" value={editData.endDate || ''} onChange={e => setEditData(d => ({ ...d, endDate: e.target.value }))}
                              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-wrap mt-1">
                        {sprint.goal && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Flag size={11} className="text-slate-400" />
                            <span>{sprint.goal}</span>
                          </div>
                        )}
                        {sprint.startDate && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            {format(new Date(sprint.startDate), 'MMM d')}
                            {sprint.endDate && ` → ${format(new Date(sprint.endDate), 'MMM d, yyyy')}`}
                          </div>
                        )}
                        {stats.points > 0 && (
                          <span className="text-xs text-slate-500">{stats.points} story points</span>
                        )}
                        <span className="text-xs text-slate-400">{pct}% complete</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete sprint dialog */}
                {isCompleting && (
                  <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Complete {sprint.title}</p>
                        {incomplete > 0 && (
                          <p className="text-xs text-amber-700 mt-0.5">
                            {incomplete} incomplete issue{incomplete > 1 ? 's' : ''} will be moved
                          </p>
                        )}
                      </div>
                    </div>

                    {incomplete > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-amber-800 block mb-1">Move to sprint</label>
                        <select value={completeNextSprint} onChange={e => setCompleteNextSprint(e.target.value)}
                          className="w-full text-sm border border-amber-300 bg-white rounded-lg px-3 py-1.5 outline-none focus:border-amber-500">
                          <option value="">Backlog (no sprint)</option>
                          {sprints.filter(s => s._id !== sprint._id && s.status !== 'completed').map(s => (
                            <option key={s._id} value={s._id}>{s.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-amber-800 block mb-1">Comment (optional)</label>
                      <input value={completeComment} onChange={e => setCompleteComment(e.target.value)}
                        placeholder="Sprint retrospective notes…"
                        className="w-full text-sm border border-amber-300 bg-white rounded-lg px-3 py-1.5 outline-none focus:border-amber-500" />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleComplete(sprint._id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                        Complete Sprint
                      </button>
                      <button onClick={() => setCompletingId(null)}
                        className="px-4 bg-white border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sprints.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap size={24} className="text-indigo-400" />
              </div>
              <p className="text-slate-600 font-medium">No sprints yet</p>
              <p className="text-xs text-slate-400 mt-1">Create your first sprint to start tracking work</p>
            </div>
          )}
        </div>

        {/* Create sprint */}
        <div className="border-t border-slate-100 p-4">
          {showCreate ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Sprint name (e.g. Sprint 3)"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                </div>
                <div className="col-span-2">
                  <input value={newGoal} onChange={e => setNewGoal(e.target.value)}
                    placeholder="Sprint goal (optional)"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30" />
                </div>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="Start date" />
                <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="End date" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                  Create Sprint
                </button>
                <button onClick={() => { setShowCreate(false); setNewTitle(''); setNewGoal(''); }}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-300 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> New Sprint
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
