import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { Send, Edit2, Trash2, MessageSquare } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

function Avatar({ name, size = 32 }) {
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: avatarColor(name) }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function CardComments({ cardId, boardId }) {
  const { user } = useSelector(s => s.auth);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!cardId) return;
    api.get(`/comments/card/${cardId}`).then(({ data }) => setComments(data)).catch(() => {});
  }, [cardId]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/comments', { text: text.trim(), cardId });
      setComments(prev => [...prev, data]);
      setText('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async id => {
    if (!editText.trim() || editLoading) return;
    setEditLoading(true);
    try {
      const { data } = await api.put(`/comments/${id}`, { text: editText.trim() });
      setComments(prev => prev.map(c => (c._id === id ? data : c)));
      setEditingId(null);
    } catch {
      toast.error('Failed to update comment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async id => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api.delete(`/comments/${id}`);
      setComments(prev => prev.filter(c => c._id !== id));
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={15} className="text-slate-400" />
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Activity {comments.length > 0 && <span className="text-slate-400">({comments.length})</span>}
        </h4>
      </div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-5">
        <Avatar name={user?.name} size={32} />
        <div className="flex-1">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Write a comment…"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 resize-none transition-all placeholder:text-slate-400"
            rows={text ? 3 : 1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} />
          {text && (
            <button type="submit" disabled={loading}
              className="mt-2 btn-sm bg-primary-600 text-white hover:bg-primary-700">
              <Send size={13} /> Post comment
            </button>
          )}
        </div>
      </form>

      {/* Comments */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment._id} className="flex gap-3 group">
            <Avatar name={comment.author?.name} size={30} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">{comment.author?.name}</span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  {comment.edited && ' · edited'}
                </span>
              </div>
              {editingId === comment._id ? (
                <div>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-400 rounded-xl text-sm focus:outline-none resize-none"
                    rows={2} autoFocus />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => handleEdit(comment._id)} disabled={editLoading}
                      className="btn-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed">
                      {editLoading ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditingId(null)}
                      className="btn-sm btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                  </div>
                  {comment.author?._id === user?._id && (
                    <div className="flex gap-3 mt-1.5 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(comment._id); setEditText(comment.text); }}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => handleDelete(comment._id)} disabled={deletingId === comment._id}
                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 size={11} /> {deletingId === comment._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
