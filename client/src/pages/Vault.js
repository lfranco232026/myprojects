import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../utils/api';

const CATEGORY_OPTIONS = ['Risk Assessment', 'SAR Guidance', 'Training', 'Templates', 'Regulatory'];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ mimeType }) {
  if (mimeType?.includes('pdf')) return <span className="text-2xl">📄</span>;
  if (mimeType?.includes('word') || mimeType?.includes('document')) return <span className="text-2xl">📝</span>;
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <span className="text-2xl">📊</span>;
  return <span className="text-2xl">📁</span>;
}

export default function Vault() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      if (search) params.set('search', search);
      const data = await api.get(`/vault?${params}`);
      setDocuments(data.documents);
      setCategories(data.categories);
    } catch (err) {
      addToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, addToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);

      await api.upload('/vault/upload', formData);
      addToast('Document uploaded');
      setShowUpload(false);
      setFile(null);
      setTitle('');
      setDescription('');
      fetchDocuments();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/vault/${id}`);
      addToast('Document deleted');
      fetchDocuments();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDownload = (id) => {
    window.open(`/api/vault/${id}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vault</h1>
          <p className="text-gray-500 mt-1">Document library for compliance resources</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(!showUpload)}
            className="bg-gold hover:bg-gold-dark text-navy px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            + Upload Document
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upload Document</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold">
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">File * (PDF, DOCX, XLSX)</label>
              <input type="file" accept=".pdf,.docx,.xlsx,.doc,.xls"
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy file:text-white hover:file:bg-navy-light" required />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={uploading}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-light disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold w-64" />
        <div className="flex gap-1">
          <button onClick={() => setActiveCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>All</button>
          {(categories.length > 0 ? categories : CATEGORY_OPTIONS).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Documents */}
      {documents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-gray-700">No documents found</h3>
          <p className="text-gray-500 mt-1">
            {search || activeCategory ? 'Try a different search or filter.' : isAdmin ? 'Upload the first document to get started.' : 'Check back soon for new resources.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <FileIcon mimeType={doc.mime_type} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{doc.title}</h4>
                  <span className="inline-block text-xs bg-gold/10 text-gold-dark px-2 py-0.5 rounded-full mt-1">
                    {doc.category}
                  </span>
                </div>
              </div>
              {doc.description && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{doc.description}</p>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  <span>{doc.uploader_name}</span>
                  <span className="mx-1">•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownload(doc.id)}
                    className="text-navy hover:text-gold text-xs font-medium">Download</button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(doc.id)}
                      className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
