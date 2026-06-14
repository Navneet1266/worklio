import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, X } from 'lucide-react';
import { createCard } from '../../store/slices/boardSlice';
import toast from 'react-hot-toast';

export default function AddCard({ listId, boardId }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => { if (open) textareaRef.current?.focus(); }, [open]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await dispatch(createCard({ title: title.trim(), listId, boardId })).unwrap();
      setTitle('');
      textareaRef.current?.focus();
    } catch {
      toast.error('Failed to create card');
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all w-full mx-0 mb-2 mt-1 border border-dashed border-slate-200 hover:border-indigo-300">
        <Plus size={15} />
        <span>Add issue</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-2 pb-2 mt-1">
      <textarea ref={textareaRef} value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Issue title…"
        className="w-full px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none resize-none rounded-2xl shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.96)',
          border: '1.5px solid rgba(99,102,241,0.5)',
          boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
        }}
        rows={2}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }} />
      <div className="flex items-center gap-2 mt-2">
        <button type="submit"
          className="text-xs font-black px-4 py-2 rounded-xl text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          Add issue
        </button>
        <button type="button" onClick={() => { setOpen(false); setTitle(''); }}
          className="w-8 h-8 text-white/50 hover:text-white/80 hover:bg-white/15 rounded-xl flex items-center justify-center transition-colors">
          <X size={15} />
        </button>
      </div>
    </form>
  );
}
