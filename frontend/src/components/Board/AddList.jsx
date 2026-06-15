import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, X } from 'lucide-react';
import { createList } from '../../store/slices/boardSlice';
import toast from 'react-hot-toast';

export default function AddList({ boardId }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await dispatch(createList({ title: title.trim(), boardId })).unwrap();
      setTitle('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 min-w-[260px] h-10 bg-white/20 hover:bg-white/30 text-white/90 hover:text-white rounded-xl px-4 text-sm font-medium transition-all flex-shrink-0 backdrop-blur-sm border border-white/20 hover:border-white/30">
        <Plus size={16} /> Add another list
      </button>
    );
  }

  return (
    <div className="min-w-[260px] bg-slate-100/90 backdrop-blur-sm rounded-2xl p-3 flex-shrink-0 border border-white/50 shadow-card">
      <form onSubmit={handleSubmit}>
        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="List title…"
          className="input-field mb-2 text-sm"
          onKeyDown={e => e.key === 'Escape' && setOpen(false)} />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading}
            className="btn-sm bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Creating…' : 'Add list'}
          </button>
          <button type="button" onClick={() => { setOpen(false); setTitle(''); }}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
