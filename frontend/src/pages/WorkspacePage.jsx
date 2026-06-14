import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Settings, X, ChevronLeft, Layers, Users, Star,
  LayoutGrid, Search, MoreHorizontal,
} from 'lucide-react';
import { fetchWorkspaces, fetchWorkspaceBoards, createBoard } from '../store/slices/workspaceSlice';
import WorkspaceSettings from '../components/Workspace/WorkspaceSettings';
import toast from 'react-hot-toast';

const BOARD_BACKGROUNDS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fd746c,#ff9068)',
  'linear-gradient(135deg,#30cfd0,#667eea)',
  'linear-gradient(135deg,#0f172a,#1e3a5f)',
  'linear-gradient(135deg,#1e293b,#334155)',
];

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

const ROLE_BADGE = {
  admin: 'bg-indigo-100 text-indigo-700',
  member: 'bg-slate-100 text-slate-600',
};

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: workspaces, boards } = useSelector(s => s.workspaces);
  const { user } = useSelector(s => s.auth);

  const workspace = workspaces.find(w => w._id === workspaceId);
  const workspaceBoards = boards[workspaceId] || [];
  const starredBoards = workspaceBoards.filter(b => b.starred?.includes(user?._id));

  const [showNewBoard, setShowNewBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardBg, setBoardBg] = useState(BOARD_BACKGROUNDS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [activeTab, setActiveTab] = useState('boards');

  useEffect(() => {
    if (workspaces.length === 0) dispatch(fetchWorkspaces());
    dispatch(fetchWorkspaceBoards(workspaceId));
  }, [workspaceId]);

  const handleCreateBoard = async e => {
    e.preventDefault();
    if (!boardTitle.trim()) return;
    try {
      const result = await dispatch(createBoard({ title: boardTitle.trim(), workspaceId, background: boardBg })).unwrap();
      toast.success('Board created!');
      setShowNewBoard(false);
      setBoardTitle('');
      navigate(`/board/${result._id}`);
    } catch (err) {
      toast.error(err || 'Failed to create board');
    }
  };

  const filteredBoards = workspaceBoards.filter(b =>
    b.title.toLowerCase().includes(boardSearch.toLowerCase())
  );

  if (!workspace) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-slate-500">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading workspace…
        </div>
      </div>
    );
  }

  const bannerGradient = `linear-gradient(135deg, ${avatarColor(workspace.name)} 0%, ${avatarColor(workspace.name + '1')} 100%)`;
  const memberCount = workspace.members?.length || 0;
  const isAdmin = workspace.members?.some(m => (m.user?._id || m.user) === user?._id && m.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero banner ── */}
      <div className="relative h-52 overflow-hidden" style={{ background: bannerGradient }}>
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20 blur-2xl bg-white" />
        <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full opacity-10 blur-3xl bg-white" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/35" />

        <div className="relative max-w-6xl mx-auto px-8 h-full flex flex-col justify-between py-5">
          {/* Back nav */}
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors w-fit group">
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>

          {/* Workspace identity */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-3xl border-2 border-white/30 shadow-lg">
                {workspace.name[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-black text-white drop-shadow-sm">{workspace.name}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  {workspace.description && (
                    <span className="text-white/70 text-sm">{workspace.description}</span>
                  )}
                  <span className="text-white/50 text-sm">·</span>
                  <span className="flex items-center gap-1 text-white/70 text-sm">
                    <Users size={13} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-white/50 text-sm">·</span>
                  <span className="flex items-center gap-1 text-white/70 text-sm">
                    <LayoutGrid size={13} /> {workspaceBoards.length} board{workspaceBoards.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewBoard(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/25 backdrop-blur-sm">
                <Plus size={15} /> New board
              </button>
              {isAdmin && (
                <button onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-xl transition-colors border border-white/20 backdrop-blur-sm">
                  <Settings size={14} /> Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 flex items-center gap-0">
          {[
            { key: 'boards', label: 'Boards', icon: LayoutGrid, count: workspaceBoards.length },
            { key: 'members', label: 'Members', icon: Users, count: memberCount },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <tab.icon size={14} />
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Boards tab */}
        {activeTab === 'boards' && (
          <>
            {/* Starred */}
            {starredBoards.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Starred boards</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {starredBoards.map(board => (
                    <WsBoardTile key={board._id} board={board} userId={user?._id}
                      onClick={() => navigate(`/board/${board._id}`)} starred />
                  ))}
                </div>
              </section>
            )}

            {/* All boards */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">All boards</h2>
              {workspaceBoards.length > 4 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                  <Search size={13} className="text-slate-400" />
                  <input value={boardSearch} onChange={e => setBoardSearch(e.target.value)}
                    placeholder="Search boards…" className="text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400 w-36" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredBoards.map(board => (
                <WsBoardTile key={board._id} board={board} userId={user?._id}
                  onClick={() => navigate(`/board/${board._id}`)}
                  starred={board.starred?.includes(user?._id)} />
              ))}

              {/* New board tile */}
              {showNewBoard ? (
                <form onSubmit={handleCreateBoard}
                  className="rounded-2xl border-2 border-dashed border-slate-200 p-3 bg-white col-span-1">
                  <input value={boardTitle} onChange={e => setBoardTitle(e.target.value)}
                    placeholder="Board name" className="input-field mb-2 text-sm" autoFocus required />
                  <div className="flex gap-1 flex-wrap mb-2">
                    {BOARD_BACKGROUNDS.map((c, i) => (
                      <button type="button" key={i} onClick={() => setBoardBg(c)}
                        className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${boardBg === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <div className="h-12 rounded-xl mb-2 relative overflow-hidden" style={{ background: boardBg }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-1.5 left-2 text-white text-xs font-bold truncate right-2">{boardTitle || 'Preview'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="submit" className="btn-sm bg-indigo-600 text-white hover:bg-indigo-700 flex-1">Create</button>
                    <button type="button" onClick={() => setShowNewBoard(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={14} /></button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowNewBoard(true)}
                  className="h-[7.5rem] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                    <Plus size={18} />
                  </div>
                  <span className="text-xs font-semibold">New board</span>
                </button>
              )}

              {filteredBoards.length === 0 && boardSearch && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <Layers size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No boards match "{boardSearch}"</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Workspace members</h2>
              {isAdmin && (
                <button onClick={() => setShowSettings(true)}
                  className="btn-primary">
                  <Plus size={14} /> Invite member
                </button>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {workspace.members?.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No members yet</p>
                </div>
              ) : (
                workspace.members?.map((m, i) => {
                  const member = m.user || m;
                  const isCurrentUser = (member._id || member) === user?._id;
                  return (
                    <div key={member._id || i}
                      className={`flex items-center gap-4 px-6 py-4 ${i !== 0 ? 'border-t border-slate-100' : ''} hover:bg-slate-50 transition-colors`}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                        style={{ background: avatarColor(member.name) }}>
                        {member.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{member.name || 'Unknown'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">{member.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_BADGE[m.role] || ROLE_BADGE.member}`}>
                        {m.role || 'member'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}>
            <WorkspaceSettings workspace={workspace} currentUserId={user?._id} onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function WsBoardTile({ board, onClick, starred }) {
  return (
    <button onClick={onClick}
      className="h-[7.5rem] rounded-2xl relative overflow-hidden group text-left transition-all hover:scale-[1.03] hover:shadow-lg">
      <div className="absolute inset-0" style={{ background: board.background }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
      {starred && (
        <div className="absolute top-2.5 right-2.5">
          <Star size={12} className="text-amber-400 fill-amber-400 drop-shadow" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <span className="text-white text-sm font-bold block truncate drop-shadow">{board.title}</span>
      </div>
    </button>
  );
}
