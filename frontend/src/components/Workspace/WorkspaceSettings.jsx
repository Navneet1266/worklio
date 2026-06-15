import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, UserPlus, Trash2, Settings, Crown, ShieldCheck, Eye } from 'lucide-react';
import { updateWorkspace, addMember, removeMember } from '../../store/slices/workspaceSlice';
import toast from 'react-hot-toast';

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avatarColor = name => AVATAR_COLORS[name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0];

const ROLE_CONFIG = {
  owner: { icon: Crown, color: 'text-violet-600', bg: 'bg-violet-100', label: 'Owner' },
  admin: { icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Admin' },
  member: { icon: null, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Member' },
  viewer: { icon: Eye, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Viewer' },
};

export default function WorkspaceSettings({ workspace, currentUserId, onClose }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('general');
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const isOwner = workspace.owner?._id === currentUserId || workspace.owner === currentUserId;
  const myMember = workspace.members?.find(m => (m.user?._id || m.user) === currentUserId);
  const isAdmin = isOwner || myMember?.role === 'admin';

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateWorkspace({ id: workspace._id, name, description })).unwrap();
      toast.success('Workspace updated');
    } catch (err) {
      toast.error(err || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async e => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await dispatch(addMember({ workspaceId: workspace._id, email: inviteEmail.trim(), role: inviteRole })).unwrap();
      toast.success(`Invited ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      toast.error(err || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId, userName) => {
    if (removingId || !confirm(`Remove ${userName} from this workspace?`)) return;
    setRemovingId(userId);
    try {
      await dispatch(removeMember({ workspaceId: workspace._id, userId })).unwrap();
      toast.success(`${userName} removed`);
    } catch (err) {
      toast.error(err || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'members', label: `Members (${workspace.members?.length || 0})` },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-modal border border-slate-200 w-full max-w-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: avatarColor(workspace.name) }}>
            {workspace.name[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">{workspace.name}</h2>
            <p className="text-slate-400 text-xs">Workspace settings</p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          <X size={17} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'general' && (
          <div>
            {isAdmin ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Workspace name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Workspace name" className="input-field" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What's this workspace for?" className="input-field resize-none" rows={3} />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="text-sm font-medium text-slate-800">{workspace.name}</p>
                </div>
                {workspace.description && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-700">{workspace.description}</p>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-4">Only admins can edit workspace settings.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-5">
            {isAdmin && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Invite member</h3>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com" className="input-field flex-1" required />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="input-field w-28 shrink-0">
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button type="submit" disabled={inviting} className="btn-primary shrink-0 disabled:opacity-60 disabled:cursor-not-allowed">
                    {inviting ? '…' : <UserPlus size={15} />}
                  </button>
                </form>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {workspace.members?.length} member{workspace.members?.length !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {workspace.members?.map(m => {
                  const member = m.user || m;
                  const memberId = member._id || member;
                  const isCurrentUser = memberId === currentUserId;
                  const isWorkspaceOwner = workspace.owner?._id === memberId || workspace.owner === memberId;
                  const role = isWorkspaceOwner ? 'owner' : m.role;
                  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.member;
                  const RoleIcon = roleConfig.icon;

                  return (
                    <div key={memberId}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ background: avatarColor(member.name) }}>
                        {member.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {member.name}
                          {isCurrentUser && <span className="text-slate-400 font-normal ml-1">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleConfig.bg} ${roleConfig.color}`}>
                          {RoleIcon && <RoleIcon size={11} />}
                          {roleConfig.label}
                        </span>
                        {isAdmin && !isCurrentUser && !isWorkspaceOwner && (
                          <button onClick={() => handleRemove(memberId, member.name)} disabled={removingId === memberId}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
