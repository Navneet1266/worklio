import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createBoard, fetchWorkspaceBoards } from '../../store/slices/workspaceSlice';
import { X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const THEMES = [
  { label: 'Ocean',    bg: 'linear-gradient(135deg,#0369a1,#0ea5e9)' },
  { label: 'Midnight', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
  { label: 'Forest',   bg: 'linear-gradient(135deg,#14532d,#16a34a)' },
  { label: 'Sunset',   bg: 'linear-gradient(135deg,#7f1d1d,#f43f5e,#fb923c)' },
  { label: 'Lavender', bg: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' },
  { label: 'Rose',     bg: 'linear-gradient(135deg,#9d174d,#ec4899)' },
  { label: 'Slate',    bg: 'linear-gradient(135deg,#1e293b,#475569)' },
  { label: 'Amber',    bg: 'linear-gradient(135deg,#92400e,#f59e0b)' },
  { label: 'Teal',     bg: 'linear-gradient(135deg,#134e4a,#0d9488)' },
  { label: 'Crimson',  bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
  { label: 'Aurora',   bg: 'linear-gradient(135deg,#065f46,#0d9488,#6d28d9)' },
  { label: 'Galaxy',   bg: 'radial-gradient(ellipse at 30% 40%,#4f46e5 0%,transparent 65%),radial-gradient(ellipse at 75% 70%,#7c3aed 0%,transparent 60%),#080818' },
];

// Column data for mini board preview
const PREVIEW_COLS = [
  { color: '#94a3b8', cards: [88, 72, 95] },
  { color: '#6366f1', cards: [65, 82] },
  { color: '#22c55e', cards: [78, 60, 88] },
];

function MiniBoardPreview({ bg }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg }}>
      {/* Subtle blob */}
      <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(20px)', pointerEvents: 'none' }} />

      {/* Columns */}
      <div style={{ display: 'flex', gap: 5, padding: '8px 7px', height: '100%', alignItems: 'flex-start' }}>
        {PREVIEW_COLS.map((col, ci) => (
          <div key={ci} style={{
            flex: 1, borderRadius: 6, overflow: 'hidden',
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.22)',
          }}>
            {/* Status accent */}
            <div style={{ height: 2.5, background: col.color }} />
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 5px 3px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <div style={{ height: 3, flex: 1, borderRadius: 99, background: 'rgba(255,255,255,0.45)' }} />
              <div style={{ height: 3, width: 8, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            {/* Cards */}
            <div style={{ padding: '1px 4px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {col.cards.map((w, i) => (
                <div key={i} style={{
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.88)',
                  padding: '3px 4px',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  <div style={{ height: 2.5, width: `${w}%`, borderRadius: 99, background: 'rgba(0,0,0,0.18)' }} />
                  <div style={{ height: 2, width: `${Math.round(w * 0.6)}%`, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateBoardModal({ workspaces, defaultWsId, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [title, setTitle]     = useState('');
  const [bg, setBg]           = useState(THEMES[0].bg);
  const [wsId, setWsId]       = useState(defaultWsId || workspaces[0]?._id || '');
  const [loading, setLoading] = useState(false);

  const handleCreate = async e => {
    e.preventDefault();
    if (!title.trim() || !wsId) return;
    setLoading(true);
    try {
      const r = await dispatch(createBoard({ title: title.trim(), workspaceId: wsId, background: bg })).unwrap();
      dispatch(fetchWorkspaceBoards(wsId));
      toast.success('Board created!');
      onClose();
      navigate(`/board/${r._id}`);
    } catch (err) {
      toast.error(err || 'Failed to create board');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-backdrop"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      <div className="w-full max-w-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col"
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Live preview banner (fixed, no scroll) ── */}
        <div className="relative h-44 overflow-hidden shrink-0" style={{ background: bg }}>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-white/8 blur-xl pointer-events-none" />

          {/* Mini kanban preview */}
          <div className="absolute inset-0 flex items-end gap-2.5 px-5 pb-5 pt-2">
            {[{ title: 'To Do', cards: 2 }, { title: 'In Progress', cards: 1 }, { title: 'Done', cards: 2 }].map((col, ci) => (
              <div key={ci} className="flex-1 min-w-0"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', padding: '8px' }}>
                <div className="text-[7px] font-black uppercase tracking-widest text-white/70 mb-1.5">{col.title}</div>
                {Array.from({ length: col.cards }).map((_, ri) => (
                  <div key={ri} className="h-4 rounded-lg mb-1 last:mb-0" style={{ background: 'rgba(255,255,255,0.25)' }} />
                ))}
              </div>
            ))}
          </div>

          {/* Board title in preview */}
          <div className="absolute top-4 left-5 right-12">
            <p className="text-white font-black text-xl drop-shadow-lg truncate">
              {title || <span className="opacity-40">Board name…</span>}
            </p>
          </div>

          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable form ── */}
        <form onSubmit={handleCreate} className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

          {/* Title */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Board name <span className="text-red-400">*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Product Roadmap, Q3 Sprint…"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-400 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-normal outline-none transition-colors focus:ring-2 focus:ring-indigo-400/20"
              autoFocus required />
          </div>

          {/* Theme picker — mini board previews */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {THEMES.map((theme, i) => {
                const selected = bg === theme.bg;
                return (
                  <button key={i} type="button" onClick={() => setBg(theme.bg)}
                    className="rounded-2xl overflow-hidden transition-all duration-150 hover:scale-[1.03] hover:shadow-lg relative"
                    style={{
                      outline: selected ? '2.5px solid #6366f1' : '2px solid transparent',
                      outlineOffset: 2,
                      boxShadow: selected ? '0 0 0 4px rgba(99,102,241,0.2)' : undefined,
                    }}>

                    {/* Mini board preview */}
                    <div className="relative" style={{ height: 90 }}>
                      <MiniBoardPreview bg={theme.bg} />

                      {/* Selected checkmark */}
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 shadow-md flex items-center justify-center z-10">
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 5.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="bg-white border-t border-slate-100 py-1.5 text-center">
                      <span className="text-[10px] font-bold text-slate-500">{theme.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace selector */}
          {workspaces.length > 1 && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Workspace
              </label>
              <select value={wsId} onChange={e => setWsId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-400 rounded-2xl text-sm font-semibold text-slate-700 outline-none transition-colors">
                {workspaces.map(ws => (
                  <option key={ws._id} value={ws._id}>{ws.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-1">
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-black py-3.5 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: bg }}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Create board</span> <ArrowRight size={15} /></>
              }
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
