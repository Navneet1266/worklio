import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Star, Plus, Settings, ChevronDown, ChevronRight,
  Layers, Bell, LogOut, X, Hash, Zap, BarChart2, Users, ArrowRight,
  Rocket, Sun, Search, TrendingUp, Clock, CheckCircle, Sparkles,
  FolderOpen, Home, BookMarked, ChevronUp,
} from 'lucide-react';
import { fetchWorkspaces, createWorkspace, fetchWorkspaceBoards, starBoard } from '../store/slices/workspaceSlice';
import { logout } from '../store/slices/authSlice';
import { fetchNotifications } from '../store/slices/notificationSlice';
import WorkspaceSettings from '../components/Workspace/WorkspaceSettings';
import NotificationPanel from '../components/Notifications/NotificationPanel';
import MyDayPanel from '../components/MyDay/MyDayPanel';
import CreateBoardModal from '../components/Board/CreateBoardModal';
import toast from 'react-hot-toast';

const PREVIEW_COLS = [
  { color: '#94a3b8', cards: [88, 72, 95] },
  { color: '#6366f1', cards: [65, 82] },
  { color: '#22c55e', cards: [78, 60, 88] },
];

const AC = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const ac = n => AC[n ? n.charCodeAt(0) % AC.length : 0];

const HOUR = new Date().getHours();
const GREETING = HOUR < 5 ? 'Good night' : HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';
const GREETING_EMOJI = HOUR < 5 ? '🌙' : HOUR < 12 ? '☀️' : HOUR < 17 ? '⛅' : '🌆';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { list: workspaces, boards } = useSelector(s => s.workspaces);
  const { unreadCount } = useSelector(s => s.notifications);

  const [expandedWs, setExpandedWs] = useState({});
  const [showNewWs, setShowNewWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(null); // wsId to create board in
  const [settingsWs, setSettingsWs] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyDay, setShowMyDay] = useState(false);
  const [wsCollapsed, setWsCollapsed] = useState({});
  const [onboardingDone] = useState(() => localStorage.getItem('tf_onboarding_dismissed') === '1');
  const [showMembersModal, setShowMembersModal] = useState(false);

  const starredSectionRef    = useRef(null);
  const workspacesSectionRef = useRef(null);

  useEffect(() => {
    dispatch(fetchWorkspaces()).then(action => {
      if (action.payload) {
        action.payload.forEach(ws => {
          dispatch(fetchWorkspaceBoards(ws._id));
          setExpandedWs(p => ({ ...p, [ws._id]: true }));
        });
      }
    });
    dispatch(fetchNotifications());
  }, []);

  const allBoards = useMemo(() => Object.values(boards).flat(), [boards]);
  const starred   = useMemo(() => allBoards.filter(b => b.starred?.includes(user?._id)), [allBoards, user]);
  const members   = useMemo(() => {
    const ids = new Set();
    workspaces.forEach(ws => ws.members?.forEach(m => ids.add(m.user?._id || m.user)));
    return ids.size;
  }, [workspaces]);

  const allWorkspaceMembers = useMemo(() => {
    const seen = new Set();
    const result = [];
    workspaces.forEach(ws => ws.members?.forEach(m => {
      const u = m.user;
      if (!u) return;
      const id = u._id || u;
      if (!seen.has(id)) { seen.add(id); result.push({ ...u, _id: id }); }
    }));
    return result;
  }, [workspaces]);

  const scrollToSection = label => {
    if (label === 'Members') { setShowMembersModal(true); return; }
    if (label === 'Starred') {
      if (starred.length === 0) { toast('No starred boards yet — star a board to track it here!'); return; }
      starredSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    workspacesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isNew = workspaces.length === 0;

  const doCreateWs = async e => {
    e.preventDefault();
    if (!wsName.trim()) return;
    try {
      const r = await dispatch(createWorkspace({ name: wsName.trim(), description: wsDesc })).unwrap();
      dispatch(fetchWorkspaceBoards(r._id));
      setExpandedWs(p => ({ ...p, [r._id]: true }));
      toast.success('Workspace created!');
      setShowNewWs(false); setWsName(''); setWsDesc('');
    } catch (e) { toast.error(e || 'Failed'); }
  };


  const STATS = [
    { label: 'Workspaces', value: workspaces.length, icon: FolderOpen, from: '#6366f1', to: '#4f46e5' },
    { label: 'Boards',     value: allBoards.length,  icon: LayoutDashboard, from: '#8b5cf6', to: '#7c3aed' },
    { label: 'Members',    value: members,            icon: Users, from: '#06b6d4', to: '#0e7490' },
    { label: 'Starred',    value: starred.length,     icon: Star,  from: '#f59e0b', to: '#d97706' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f1f5f9' }}>

      {/* ════════ SIDEBAR ════════ */}
      <aside className="w-[240px] shrink-0 flex flex-col h-full" style={{ background: '#0c1222' }}>

        {/* Logo */}
        <div className="px-5 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Layers size={17} className="text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-black text-[15px] tracking-tight">Worklio</span>
              <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded-full tracking-widest">PRO</span>
            </div>
          </div>
        </div>

        {/* Search shortcut */}
        <div className="px-3 mb-2 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <Search size={13} />
            <span className="text-xs flex-1">Search…</span>
            <span className="text-[10px] text-slate-600 bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 space-y-0.5 shrink-0">
          <SideItem icon={Home} label="Home" active onClick={() => navigate('/dashboard')} />
          <SideItem icon={Sun} label="My Day" badge={unreadCount > 0 ? '!' : null}
            accent="amber" onClick={() => setShowMyDay(true)} />
          {starred.length > 0 && (
            <SideItem icon={Star} label="Starred" badge={starred.length} accent="amber" />
          )}
        </nav>

        <div className="mx-3 my-3 border-t border-white/5 shrink-0" />

        {/* Workspaces label */}
        <div className="px-4 pb-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Workspaces</span>
          <button onClick={() => setShowNewWs(true)}
            className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <Plus size={11} />
          </button>
        </div>

        {/* Workspace list */}
        <div className="flex-1 px-3 overflow-y-auto space-y-0.5">
          {workspaces.map(ws => (
            <div key={ws._id}>
              <button onClick={() => setExpandedWs(p => ({ ...p, [ws._id]: !p[ws._id] }))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors group">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                  style={{ background: ac(ws.name) }}>
                  {ws.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm flex-1 text-left truncate font-medium">{ws.name}</span>
                <span className="text-[10px] text-slate-600 font-semibold">{(boards[ws._id] || []).length}</span>
                {expandedWs[ws._id]
                  ? <ChevronDown size={12} className="text-slate-600 shrink-0" />
                  : <ChevronRight size={12} className="text-slate-600 shrink-0" />}
              </button>
              {expandedWs[ws._id] && (
                <div className="ml-3 pl-3 border-l border-white/5 mt-0.5 mb-1 space-y-0.5">
                  {(boards[ws._id] || []).map(b => (
                    <button key={b._id} onClick={() => navigate(`/board/${b._id}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-colors text-xs">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: b.background || '#6366f1' }} />
                      <span className="truncate">{b.title}</span>
                    </button>
                  ))}
                  <button onClick={() => setShowNewBoard(ws._id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors text-xs">
                    <Plus size={11} /> <span>Add board</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {isNew && (
            <button onClick={() => setShowNewWs(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-slate-600 hover:text-slate-400 hover:border-white/20 transition-colors text-sm">
              <Plus size={14} /> Create workspace
            </button>
          )}
        </div>

        {/* Bottom nav */}
        <div className="border-t border-white/5 p-3 space-y-0.5 shrink-0">
          <SideItem icon={Bell} label="Notifications"
            badge={unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null}
            onClick={() => setShowNotif(v => !v)} />
          <SideItem icon={LogOut} label="Sign out" danger
            onClick={() => { dispatch(logout()); navigate('/login'); }} />
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center px-6 gap-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm z-10 relative">
          <div className="flex-1" />

          {/* My Day CTA */}
          <button onClick={() => setShowMyDay(true)}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
            <Sun size={15} /> My Day
          </button>

          {/* Notifications */}
          <button onClick={() => { setShowNotif(v => !v); setShowUserMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => { setShowUserMenu(v => !v); setShowNotif(false); }}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                style={{ background: `linear-gradient(135deg,${ac(user?.name)},${ac((user?.name || '') + '1')})` }}>
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                      style={{ background: `linear-gradient(135deg,${ac(user?.name)},${ac((user?.name||'')+'1')})` }}>
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{user?.name}</p>
                      <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => { dispatch(logout()); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-2xl">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── HERO BANNER ── */}
          <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)', minHeight: 192 }}>
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle,#818cf8,transparent)', transform: 'translate(30%,-30%)' }} />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle,#a78bfa,transparent)', transform: 'translateY(50%)' }} />
            <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full opacity-5"
              style={{ background: 'radial-gradient(circle,#60a5fa,transparent)' }} />

            {/* Grid dots overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative max-w-6xl mx-auto px-8 py-8">
              <div className="flex items-start justify-between gap-8">
                <div>
                  {/* Greeting */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{GREETING_EMOJI}</span>
                    <div>
                      <h1 className="text-2xl font-black text-white tracking-tight">
                        {GREETING}, {user?.name?.split(' ')[0]}!
                      </h1>
                      <p className="text-indigo-300 text-sm mt-0.5">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Hero sub-message */}
                  <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                    {isNew
                      ? 'Welcome to Worklio — your all-in-one agile workspace. Let\'s get your first project set up.'
                      : `You're managing ${allBoards.length} board${allBoards.length !== 1 ? 's' : ''} across ${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}. Keep shipping! 🚀`}
                  </p>

                  {/* Hero action buttons */}
                  <div className="flex items-center gap-3 mt-5">
                    <button onClick={() => setShowNewWs(true)}
                      className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      <Plus size={15} /> New Workspace
                    </button>
                    <button onClick={() => setShowMyDay(true)}
                      className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white/80 border border-white/20 hover:bg-white/10 transition-colors backdrop-blur-sm">
                      <Sun size={14} /> View My Day
                    </button>
                  </div>
                </div>

                {/* Hero quick stats */}
                {!isNew && (
                  <div className="hidden lg:grid grid-cols-2 gap-3 shrink-0">
                    {STATS.map(s => (
                      <button key={s.label} onClick={() => scrollToSection(s.label)}
                        className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3 hover:bg-white/20 hover:border-white/30 hover:scale-[1.02] transition-all min-w-[130px] group text-left">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                          style={{ background: `linear-gradient(135deg,${s.from},${s.to})` }}>
                          <s.icon size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xl font-black text-white">{s.value}</p>
                          <p className="text-[11px] text-slate-400 font-medium group-hover:text-slate-300 transition-colors">{s.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div className="max-w-6xl mx-auto px-8 py-8">

            {/* Mobile stats row */}
            {!isNew && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 lg:hidden">
                {STATS.map(s => (
                  <button key={s.label} onClick={() => scrollToSection(s.label)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 hover:scale-[1.02] transition-all text-left group">
                    <div className="w-9 h-9 rounded-xl mb-2.5 flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: `linear-gradient(135deg,${s.from},${s.to})` }}>
                      <s.icon size={15} className="text-white" />
                    </div>
                    <p className="text-xl font-black text-slate-900">{s.value}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 group-hover:text-indigo-500 transition-colors">{s.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* ── FIRST-TIME ONBOARDING ── */}
            {isNew && !onboardingDone && (
              <div className="mb-10">
                {/* Feature grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { icon: Layers, label: 'Kanban Boards', desc: 'Drag-and-drop task management', from: '#6366f1', to: '#4f46e5' },
                    { icon: Zap,    label: 'Sprint Planning', desc: 'Agile velocity tracking',      from: '#8b5cf6', to: '#7c3aed' },
                    { icon: Users,  label: 'Team View',      desc: 'See who is doing what',        from: '#06b6d4', to: '#0e7490' },
                    { icon: BarChart2, label: 'Analytics',   desc: 'Lead dashboard & reports',     from: '#10b981', to: '#059669' },
                  ].map(f => (
                    <div key={f.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow group">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                        style={{ background: `linear-gradient(135deg,${f.from},${f.to})` }}>
                        <f.icon size={18} className="text-white" />
                      </div>
                      <p className="text-sm font-black text-slate-800">{f.label}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Get started card */}
                <div className="rounded-3xl overflow-hidden border border-indigo-200 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)' }}>
                  <div className="relative p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                      style={{ background: 'radial-gradient(circle,#a78bfa,transparent)', transform: 'translate(20%,-30%)' }} />
                    <div className="relative flex items-start justify-between gap-8">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Rocket size={18} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-white text-lg">Get started in 4 steps</h3>
                            <p className="text-indigo-300 text-sm">Set up your first project in 2 minutes</p>
                          </div>
                        </div>
                        <button onClick={() => setShowNewWs(true)}
                          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 transition-colors shadow-lg mt-4">
                          <Plus size={15} /> Create your first workspace
                        </button>
                      </div>
                      <div className="hidden md:grid grid-cols-2 gap-2 shrink-0">
                        {[
                          { n: 1, t: 'Create Workspace', c: 'bg-white text-indigo-700' },
                          { n: 2, t: 'Add a Board', c: 'bg-white/20 text-white' },
                          { n: 3, t: 'Create Issues', c: 'bg-white/20 text-white' },
                          { n: 4, t: 'Invite Team', c: 'bg-white/20 text-white' },
                        ].map(s => (
                          <div key={s.n} className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${s.c} border border-white/20`}>
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black shrink-0">{s.n}</span>
                            <span className="text-xs font-bold whitespace-nowrap">{s.t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STARRED BOARDS ── */}
            {starred.length > 0 && (
              <section ref={starredSectionRef} className="mb-10">
                <SectionHeader icon={Star} label="Starred" iconClass="text-amber-400 fill-amber-400" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {starred.map(b => (
                    <BoardCard key={b._id} board={b} userId={user?._id}
                      onClick={() => navigate(`/board/${b._id}`)}
                      onStar={e => { e.stopPropagation(); dispatch(starBoard({ boardId: b._id, userId: user._id })); }} />
                  ))}
                </div>
              </section>
            )}

            {/* ── WORKSPACES ── */}
            {!isNew && (
              <div ref={workspacesSectionRef}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Your Workspaces</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{workspaces.length}</span>
                  </div>
                  <button onClick={() => setShowNewWs(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
                    <Plus size={12} /> New workspace
                  </button>
                </div>

                <div className="space-y-4">
                  {workspaces.map(ws => {
                    const wsBoards = boards[ws._id] || [];
                    const mCount = ws.members?.length || 0;
                    const collapsed = wsCollapsed[ws._id];
                    const wsColor = ac(ws.name);
                    const wsColor2 = ac(ws.name + '1');

                    return (
                      <div key={ws._id} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80"
                        style={{ boxShadow: `inset 4px 0 0 ${wsColor}, 0 1px 4px rgba(0,0,0,0.06)` }}>

                        {/* Header row */}
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                          {/* Workspace icon */}
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                            style={{ background: `linear-gradient(135deg,${wsColor},${wsColor2})` }}>
                            {ws.name[0]?.toUpperCase()}
                          </div>

                          {/* Name + desc */}
                          <button className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                            onClick={() => navigate(`/workspace/${ws._id}`)}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate">{ws.name}</span>
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                {wsBoards.length}
                              </span>
                            </div>
                            {ws.description && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{ws.description}</p>
                            )}
                          </button>

                          {/* Member avatars */}
                          {mCount > 0 && (
                            <div className="flex -space-x-1.5 shrink-0">
                              {(ws.members || []).slice(0, 4).map((m, i) => {
                                const n = m.user?.name || '';
                                return (
                                  <div key={i} title={n}
                                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black"
                                    style={{ background: ac(n) }}>
                                    {n[0]?.toUpperCase() || '?'}
                                  </div>
                                );
                              })}
                              {mCount > 4 && (
                                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] text-slate-500 font-black">
                                  +{mCount - 4}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          <button onClick={() => setShowNewBoard(ws._id)}
                            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0">
                            <Plus size={11} /> Board
                          </button>
                          <button onClick={() => setSettingsWs(ws)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
                            <Settings size={13} />
                          </button>
                          <button onClick={() => setWsCollapsed(p => ({ ...p, [ws._id]: !p[ws._id] }))}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
                            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                          </button>
                        </div>

                        {/* Board grid */}
                        {!collapsed && (
                          <div className="p-4 bg-slate-50/60">
                            {wsBoards.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No boards yet —
                                <button onClick={() => setShowNewBoard(ws._id)} className="text-indigo-500 hover:underline ml-1 font-semibold">create one</button>
                              </p>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                              {wsBoards.map(board => (
                                <BoardCard key={board._id} board={board}
                                  userId={user?._id}
                                  onClick={() => navigate(`/board/${board._id}`)}
                                  onStar={e => {
                                    e.stopPropagation();
                                    dispatch(starBoard({ boardId: board._id, userId: user._id }));
                                  }} />
                              ))}
                              <NewBoardTile onClick={() => setShowNewBoard(ws._id)} />
                            </div>
                          </div>
                        )}

                        {/* Collapsed quick-jump */}
                        {collapsed && wsBoards.length > 0 && (
                          <div className="flex items-center gap-1.5 px-5 py-2.5 flex-wrap bg-slate-50/60">
                            {wsBoards.slice(0, 6).map(b => (
                              <button key={b._id} onClick={() => navigate(`/board/${b._id}`)}
                                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-all">
                                <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: b.background?.includes('gradient') ? b.background : wsColor }} />
                                <span className="max-w-[80px] truncate">{b.title}</span>
                              </button>
                            ))}
                            {wsBoards.length > 6 && (
                              <button onClick={() => setWsCollapsed(p => ({ ...p, [ws._id]: false }))}
                                className="text-xs font-semibold text-slate-400 hover:text-indigo-500 transition-colors">
                                +{wsBoards.length - 6} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New-user empty state (after dismissing onboarding) */}
            {isNew && onboardingDone && (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center bg-white">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Layers size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Create your first workspace</h3>
                <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
                  Bring your team's boards and projects together in one place.
                </p>
                <button onClick={() => setShowNewWs(true)}
                  className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Plus size={16} /> Create Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Workspace Modal ── */}
      {showNewWs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-backdrop"
          onClick={() => setShowNewWs(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}>
            {/* Modal gradient header */}
            <div className="px-7 pt-7 pb-5" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <FolderOpen size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-white">Create workspace</h3>
                    <p className="text-indigo-300 text-xs mt-0.5">Bring your team together</p>
                  </div>
                </div>
                <button onClick={() => setShowNewWs(false)} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <form onSubmit={doCreateWs} className="p-7 space-y-4">
              <div>
                <label className="text-sm font-black text-slate-700 block mb-2">Workspace name <span className="text-red-400">*</span></label>
                <input value={wsName} onChange={e => setWsName(e.target.value)}
                  placeholder="e.g. Engineering, Design, Marketing"
                  className="input-field" required autoFocus />
              </div>
              <div>
                <label className="text-sm font-black text-slate-700 block mb-2">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input value={wsDesc} onChange={e => setWsDesc(e.target.value)}
                  placeholder="What's this workspace for?" className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Plus size={15} /> Create workspace
                </button>
                <button type="button" onClick={() => setShowNewWs(false)} className="btn-secondary px-5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {settingsWs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSettingsWs(null)}>
          <div onClick={e => e.stopPropagation()}>
            <WorkspaceSettings workspace={settingsWs} currentUserId={user?._id} onClose={() => setSettingsWs(null)} />
          </div>
        </div>
      )}

      {/* ── Members modal ── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-backdrop"
          style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowMembersModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col"
            style={{ maxHeight: 'calc(100vh - 4rem)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#0e7490)' }}>
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">All Members</h3>
                  <p className="text-[11px] text-slate-400">{allWorkspaceMembers.length} people across {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setShowMembersModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Members list */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
              {allWorkspaceMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={32} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm">No members yet. Invite people to your workspaces.</p>
                </div>
              ) : (
                allWorkspaceMembers.map(m => (
                  <div key={m._id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-sm"
                      style={{ background: ac(m.name) }}>
                      {m.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Active" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}

      {showMyDay && <MyDayPanel onClose={() => setShowMyDay(false)} />}

      {showNewBoard && (
        <CreateBoardModal
          workspaces={workspaces}
          defaultWsId={showNewBoard}
          onClose={() => setShowNewBoard(null)}
        />
      )}
    </div>
  );
}

/* ── Sidebar item ── */
function SideItem({ icon: Icon, label, active, badge, accent, danger, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm ${
        active
          ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
          : danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-slate-400 hover:bg-white/8 hover:text-white'
      }`}>
      <Icon size={15} className={active ? 'text-indigo-400' : accent === 'amber' ? 'text-amber-400' : ''} />
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge != null && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
          accent === 'amber'
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-indigo-500 text-white w-5 h-5 flex items-center justify-center rounded-full'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, label, iconClass }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Icon size={15} className={iconClass || 'text-slate-400'} />
      <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</h2>
      <div className="flex-1 h-px bg-slate-200/60" />
    </div>
  );
}

/* ── Board card ── */
function BoardCard({ board, userId, onClick, onStar }) {
  const isStarred = board.starred?.includes(userId);
  return (
    <div className="relative group">
      <button onClick={onClick}
        className="w-full h-36 rounded-xl relative overflow-hidden text-left transition-all duration-150 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-lg">

        {/* Theme gradient background */}
        <div className="absolute inset-0" style={{ background: board.background || 'linear-gradient(135deg,#0369a1,#0ea5e9)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

        {/* Mini kanban columns preview */}
        <div className="absolute inset-x-0 top-0" style={{ height: '72%', padding: '7px 7px 0' }}>
          <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'flex-start' }}>
            {PREVIEW_COLS.map((col, ci) => (
              <div key={ci} style={{
                flex: 1, borderRadius: 5, overflow: 'hidden',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}>
                <div style={{ height: 2.5, background: col.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, padding: '3px 4px 2px' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <div style={{ height: 2.5, flex: 1, borderRadius: 99, background: 'rgba(255,255,255,0.4)' }} />
                </div>
                <div style={{ padding: '0 3px 4px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {col.cards.slice(0, 2).map((w, i) => (
                    <div key={i} style={{
                      borderRadius: 3, background: 'rgba(255,255,255,0.85)',
                      padding: '2.5px 3px', display: 'flex', flexDirection: 'column', gap: 1.5,
                    }}>
                      <div style={{ height: 2, width: `${w}%`, borderRadius: 99, background: 'rgba(0,0,0,0.18)' }} />
                      <div style={{ height: 1.5, width: `${Math.round(w * 0.6)}%`, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dark fade at bottom for title legibility */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

        <div className="absolute bottom-0 inset-x-0 px-3 pb-3">
          <span className="text-white text-[13px] font-bold drop-shadow block leading-snug line-clamp-2">{board.title}</span>
        </div>
      </button>

      <button onClick={onStar}
        className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
          isStarred
            ? 'bg-black/25 backdrop-blur-sm opacity-100'
            : 'bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100'
        }`}
        title={isStarred ? 'Unstar' : 'Star board'}>
        <Star size={11} className={isStarred ? 'text-amber-400 fill-amber-400' : 'text-white'} />
      </button>
    </div>
  );
}

/* ── New board tile ── */
function NewBoardTile({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="h-36 rounded-xl flex flex-col items-center justify-center gap-2.5 transition-all duration-200 border border-dashed"
      style={{
        borderColor: hov ? '#a5b4fc' : '#e2e8f0',
        background: hov ? 'linear-gradient(135deg,#f0f1ff,#f5f3ff)' : '#fafbfc',
      }}>

      {/* Mini wireframe kanban */}
      <div className="flex gap-1 transition-all duration-200"
        style={{ opacity: hov ? 0.85 : 0.3 }}>
        {[2, 3, 1].map((rows, ci) => (
          <div key={ci} className="w-7 rounded-md flex flex-col gap-1 p-1"
            style={{
              background: hov ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${hov ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.08)'}`,
              minHeight: 36,
            }}>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="h-1.5 rounded-full"
                style={{ background: hov ? 'rgba(99,102,241,0.35)' : 'rgba(0,0,0,0.12)' }} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 transition-colors duration-200"
        style={{ color: hov ? '#6366f1' : '#94a3b8' }}>
        <Plus size={13} />
        <span className="text-[11px] font-semibold">New board</span>
      </div>
    </button>
  );
}
