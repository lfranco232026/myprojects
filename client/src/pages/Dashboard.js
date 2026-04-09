import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../utils/api';

function AnnouncementForm({ initial, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [pinned, setPinned] = useState(initial?.pinned || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, body, pinned });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">{initial ? 'Edit' : 'New'} Announcement</h3>
      <div className="space-y-4">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Title" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold" required />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
          placeholder="Write your announcement... (Markdown supported)" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold resize-none" required />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
          Pin this announcement
        </label>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light">
          {initial ? 'Update' : 'Publish'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await api.get('/announcements');
      setAnnouncements(data.announcements);
    } catch (err) {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleCreate = async (data) => {
    try {
      await api.post('/announcements', data);
      addToast('Announcement published');
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.put(`/announcements/${editing.id}`, data);
      addToast('Announcement updated');
      setEditing(null);
      fetchAnnouncements();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      addToast('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      await api.put(`/announcements/${ann.id}`, { pinned: !ann.pinned });
      addToast(ann.pinned ? 'Unpinned' : 'Pinned');
      fetchAnnouncements();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Stay up to date with the latest from Signal</p>
        </div>
        {isAdmin && !showForm && !editing && (
          <button onClick={() => setShowForm(true)}
            className="bg-gold hover:bg-gold-dark text-navy px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            + New Announcement
          </button>
        )}
      </div>

      {showForm && (
        <AnnouncementForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editing && (
        <AnnouncementForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📢</div>
          <h3 className="text-lg font-semibold text-gray-700">No announcements yet</h3>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Create the first announcement to get started.' : 'Check back soon for updates from your admin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id}
              className={`bg-white rounded-xl border p-6 transition-all ${
                ann.pinned ? 'border-gold/50 ring-1 ring-gold/20' : 'border-gray-200'
              } ${!ann.is_read ? 'border-l-4 border-l-gold' : ''}`}
              onClick={() => !ann.is_read && markAsRead(ann.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {ann.pinned && (
                      <span className="text-xs bg-gold/10 text-gold-dark px-2 py-0.5 rounded-full font-medium">
                        📌 Pinned
                      </span>
                    )}
                    {!ann.is_read && (
                      <span className="w-2 h-2 bg-gold rounded-full"></span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{ann.title}</h3>
                  <div className="text-gray-600 mt-2 text-sm markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.body) }} />
                  <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
                    <span>By {ann.author_name}</span>
                    <span>•</span>
                    <span>{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleTogglePin(ann); }}
                      className="p-1.5 text-gray-400 hover:text-gold rounded" title={ann.pinned ? 'Unpin' : 'Pin'}>
                      📌
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditing(ann); setShowForm(false); }}
                      className="p-1.5 text-gray-400 hover:text-navy rounded" title="Edit">
                      ✏️
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(ann.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Delete">
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
