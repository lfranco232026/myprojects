import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../utils/api';

const INSTITUTION_TYPES = ['Bank', 'Credit Union', 'Fintech', 'MSB', 'Insurance', 'Other'];

function ProfileEditor({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name || '');
  const [title, setTitle] = useState(user.title || '');
  const [institutionType, setInstitutionType] = useState(user.institution_type || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedin_url || '');
  const [bio, setBio] = useState(user.bio || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, title, institution_type: institutionType, linkedin_url: linkedinUrl, bio });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Edit Profile</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. BSA Officer" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
          <select value={institutionType} onChange={e => setInstitutionType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold">
            <option value="">Select...</option>
            {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="A short bio about yourself..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light">
          Save Profile
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Members() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/members${params}`);
      setMembers(data.members);
    } catch (err) {
      addToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSaveProfile = async (data) => {
    try {
      await api.put('/members/profile', data);
      addToast('Profile updated');
      setEditing(false);
      fetchMembers();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this member?')) return;
    try {
      await api.put(`/members/${id}/deactivate`);
      addToast('Member deactivated');
      fetchMembers();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const data = await api.post('/auth/invite');
      const url = `${window.location.origin}/register/${data.code}`;
      setInviteCode(url);
      setShowInvite(true);
      addToast('Invite link generated');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    addToast('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    );
  }

  const currentUserFull = members.find(m => m.id === user.id);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">{members.length} active members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Edit My Profile
          </button>
          {isAdmin && (
            <button onClick={handleGenerateInvite}
              className="bg-gold hover:bg-gold-dark text-navy px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              + Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Invite link */}
      {showInvite && (
        <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 font-medium mb-2">Invite Link (expires in 7 days)</p>
          <div className="flex gap-2">
            <input type="text" readOnly value={inviteCode}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600" />
            <button onClick={copyInvite}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium">Copy</button>
            <button onClick={() => setShowInvite(false)}
              className="text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </div>
      )}

      {/* Profile editor */}
      {editing && currentUserFull && (
        <ProfileEditor user={currentUserFull} onSave={handleSaveProfile} onCancel={() => setEditing(false)} />
      )}

      {/* Search */}
      <div className="mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search members by name, title, or institution..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
      </div>

      {/* Member list */}
      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-700">No members found</h3>
          <p className="text-gray-500 mt-1">
            {search ? 'Try a different search term.' : 'Invite members to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map(member => (
            <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center text-navy font-semibold text-lg flex-shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    {member.role === 'admin' && (
                      <span className="text-[10px] bg-gold/10 text-gold-dark px-1.5 py-0.5 rounded font-medium">ADMIN</span>
                    )}
                    {member.id === user.id && (
                      <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded font-medium">YOU</span>
                    )}
                  </div>
                  {member.title && <p className="text-sm text-gray-600">{member.title}</p>}
                  {member.institution_type && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1">
                      {member.institution_type}
                    </span>
                  )}
                  {member.bio && <p className="text-sm text-gray-500 mt-2">{member.bio}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    {member.linkedin_url && (
                      <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-navy hover:text-gold font-medium">LinkedIn ↗</a>
                    )}
                    <span className="text-xs text-gray-400">
                      Joined {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    {isAdmin && member.id !== user.id && (
                      <button onClick={() => handleDeactivate(member.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-auto">Deactivate</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
