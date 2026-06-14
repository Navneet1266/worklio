import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { X, Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { fetchNotifications, markAsRead, markAllRead, deleteNotification } from '../../store/slices/notificationSlice';

const TYPE_META = {
  assignment:   { icon: '📋', label: 'Assigned',     color: '#6366f1' },
  comment:      { icon: '💬', label: 'Comment',       color: '#0ea5e9' },
  due_date:     { icon: '📅', label: 'Due date',      color: '#f59e0b' },
  member_added: { icon: '👋', label: 'Member added',  color: '#10b981' },
  board_invite: { icon: '📌', label: 'Board invite',  color: '#8b5cf6' },
  mention:      { icon: '@',  label: 'Mention',       color: '#ec4899' },
};

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

export default function NotificationPanel({ onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, loading } = useSelector(s => s.notifications);

  const unread = list.filter(n => !n.read);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  const handleClick = n => {
    if (!n.read) dispatch(markAsRead(n._id));
    if (n.link) navigate(n.link);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-fade-backdrop"
        onClick={onClose} />

      {/* Slide-in panel */}
      <div className="relative w-[400px] max-w-[100vw] h-full bg-white flex flex-col shadow-2xl animate-panel-in"
        onClick={e => e.stopPropagation()}>

        {/* Top accent line */}
        <div className="h-1 w-full shrink-0"
          style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Bell size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-sm">Notifications</h2>
              <p className="text-[11px] text-slate-400">
                {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unread.length > 0 && (
              <button onClick={() => dispatch(markAllRead())}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                <Check size={12} /> Mark all read
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)' }}>
                <Bell size={28} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-sm mb-1">You're all caught up!</p>
              <p className="text-slate-400 text-xs">Notifications about assignments, comments, and due dates will appear here.</p>
            </div>
          ) : (
            <div>
              {/* Unread section */}
              {unread.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Unread · {unread.length}
                    </span>
                  </div>
                  {unread.map(n => (
                    <NotifItem key={n._id} n={n} onClick={() => handleClick(n)}
                      onDelete={e => { e.stopPropagation(); dispatch(deleteNotification(n._id)); }} />
                  ))}
                </div>
              )}

              {/* Read section */}
              {list.filter(n => n.read).length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earlier</span>
                  </div>
                  {list.filter(n => n.read).map(n => (
                    <NotifItem key={n._id} n={n} onClick={() => handleClick(n)}
                      onDelete={e => { e.stopPropagation(); dispatch(deleteNotification(n._id)); }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {list.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 shrink-0">
            <p className="text-[11px] text-slate-400 text-center">
              Showing {list.length} notification{list.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function NotifItem({ n, onClick, onDelete }) {
  const meta = TYPE_META[n.type] || { icon: '🔔', label: 'Notification', color: '#6366f1' };

  return (
    <div onClick={onClick}
      className={`group flex items-start gap-3 px-5 py-3.5 cursor-pointer border-b border-slate-50 transition-colors relative hover:bg-slate-50 ${
        !n.read ? 'bg-indigo-50/40' : ''
      }`}>

      {/* Unread dot */}
      {!n.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
      )}

      {/* Avatar or icon */}
      <div className="shrink-0 mt-0.5">
        {n.sender?.name ? (
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm"
            style={{ background: avatarColor(n.sender.name) }}>
            {n.sender.name[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg"
            style={{ background: `${meta.color}18` }}>
            {meta.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
          {n.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[11px] text-slate-400">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </p>
          {n.link && (
            <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-0.5">
              <ExternalLink size={9} /> View
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button onClick={onDelete}
        className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all mt-0.5">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
