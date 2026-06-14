import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, ChevronDown, LogOut, Layers, LayoutDashboard } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import NotificationPanel from '../Notifications/NotificationPanel';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

export default function Navbar({ transparent = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { unreadCount } = useSelector(s => s.notifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  return (
    <nav className={`h-12 flex items-center px-4 gap-2 z-40 relative shrink-0 ${
      transparent ? 'bg-black/25 backdrop-blur-sm' : 'bg-slate-900 border-b border-slate-800'
    }`}>
      <Link to="/dashboard" className="flex items-center gap-2 text-white font-bold mr-2">
        <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
          <Layers size={14} className="text-white" />
        </div>
        <span className="hidden sm:block text-sm tracking-tight">Worklio</span>
      </Link>

      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(v => !v); setShowUserMenu(false); }}
          className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setShowUserMenu(v => !v); setShowNotifications(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/15 transition-colors"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: avatarColor(user?.name) }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-white text-sm font-medium hidden sm:block max-w-[100px] truncate">{user?.name}</span>
          <ChevronDown size={13} className="text-white/50" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1.5 z-50 animate-slide-in">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="font-semibold text-slate-800 text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs mt-0.5 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { navigate('/dashboard'); setShowUserMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LayoutDashboard size={14} className="text-slate-400" /> Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} className="text-red-400" /> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
