import { useState } from 'react';
import { Plus, X, CheckSquare } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CardChecklist({ checklist, cardId }) {
  const [items, setItems] = useState(checklist.items || []);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);

  const completed = items.filter(i => i.completed).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const toggleItem = async item => {
    const updated = items.map(i => i._id === item._id ? { ...i, completed: !i.completed } : i);
    setItems(updated);
    try {
      await api.patch(`/cards/${cardId}/checklists/${checklist._id}/items/${item._id}`, {
        completed: !item.completed,
      });
    } catch {
      setItems(items);
      toast.error('Failed to update item');
    }
  };

  const addItem = async e => {
    e.preventDefault();
    if (!newItemText.trim() || addingLoading) return;
    setAddingLoading(true);
    try {
      const { data } = await api.post(`/cards/${cardId}/checklists/${checklist._id}/items`, {
        text: newItemText.trim(),
      });
      const newItem = data.checklists.find(cl => cl._id === checklist._id)?.items.slice(-1)[0];
      if (newItem) setItems(prev => [...prev, newItem]);
      setNewItemText('');
    } catch {
      toast.error('Failed to add item');
    } finally {
      setAddingLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <CheckSquare size={15} className="text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-700">{checklist.title}</h4>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5 mb-2">
        {items.map(item => (
          <label key={item._id}
            className="flex items-start gap-2.5 cursor-pointer group py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="mt-0.5 shrink-0">
              <input type="checkbox" checked={item.completed} onChange={() => toggleItem(item)}
                className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
            </div>
            <span className={`text-sm flex-1 leading-snug transition-colors ${
              item.completed ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-slate-900'
            }`}>
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* Add item */}
      {addingItem ? (
        <form onSubmit={addItem} className="mt-2 pl-1">
          <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
            placeholder="Add an item…"
            className="w-full px-3 py-2 border border-primary-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            autoFocus
            onKeyDown={e => e.key === 'Escape' && setAddingItem(false)} />
          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={addingLoading} className="btn-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed">
              {addingLoading ? 'Adding…' : 'Add'}</button>
            <button type="button" onClick={() => { setAddingItem(false); setNewItemText(''); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAddingItem(true)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors mt-1">
          <Plus size={14} /> Add an item
        </button>
      )}
    </div>
  );
}
