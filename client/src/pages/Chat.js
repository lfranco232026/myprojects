import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../utils/api';

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '💡', '✅', '👀', '🎉', '😂'];

function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br/>');
}

function MessageItem({ msg, onReply, onReact, currentUserId }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="group py-3 px-4 hover:bg-gray-50 rounded-lg">
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center text-navy text-xs font-semibold flex-shrink-0 mt-0.5">
          {msg.author_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-gray-900">{msg.author_name}</span>
            {msg.author_role === 'admin' && (
              <span className="text-[10px] bg-gold/10 text-gold-dark px-1.5 py-0.5 rounded font-medium">ADMIN</span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-sm text-gray-700 mt-0.5 markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />

          {/* Reactions */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {msg.reactions.map((r, i) => (
                <button key={i}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    r.user_ids?.split(',').includes(currentUserId)
                      ? 'bg-gold/10 border-gold/30 text-gold-dark'
                      : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {r.emoji} {r.count}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="text-xs text-gray-400 hover:text-gray-600">😀</button>
            <button onClick={() => onReply(msg)}
              className="text-xs text-gray-400 hover:text-gray-600">Reply</button>
          </div>

          {showEmoji && (
            <div className="flex gap-1 mt-1 bg-white border border-gray-200 rounded-lg p-2 shadow-lg w-fit">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                  className="hover:bg-gray-100 rounded p-1 text-lg">{e}</button>
              ))}
            </div>
          )}

          {/* Replies */}
          {msg.replies && msg.replies.length > 0 && (
            <div className="mt-2">
              <button onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-navy font-medium hover:underline">
                {showReplies ? 'Hide' : 'Show'} {msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}
              </button>
              {showReplies && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-2">
                  {msg.replies.map(reply => (
                    <div key={reply.id} className="py-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-xs text-gray-900">{reply.author_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(reply.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.content) }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const messagesEndRef = useRef(null);
  const lastMessageTime = useRef(null);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await api.get('/channels');
      setChannels(data.channels);
      if (!channelId && data.channels.length > 0) {
        navigate(`/chat/${data.channels[0].id}`, { replace: true });
      }
    } catch (err) {
      addToast('Failed to load channels', 'error');
    }
  }, [channelId, navigate, addToast]);

  const fetchMessages = useCallback(async (poll = false) => {
    if (!channelId) return;
    try {
      const params = poll && lastMessageTime.current ? `?after=${encodeURIComponent(lastMessageTime.current)}` : '';
      const data = await api.get(`/messages/${channelId}${params}`);
      if (poll && data.messages.length > 0) {
        setMessages(prev => [...prev, ...data.messages]);
      } else if (!poll) {
        setMessages(data.messages);
      }
      if (data.messages.length > 0) {
        lastMessageTime.current = data.messages[data.messages.length - 1].created_at;
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);
  useEffect(() => {
    setLoading(true);
    lastMessageTime.current = null;
    fetchMessages();
  }, [channelId, fetchMessages]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!channelId) return;
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
  }, [channelId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const data = await api.post(`/messages/${channelId}`, {
        content: input,
        parent_id: replyTo?.id || null,
      });
      if (replyTo) {
        setMessages(prev => prev.map(m =>
          m.id === replyTo.id ? { ...m, replies: [...(m.replies || []), data.message] } : m
        ));
      } else {
        setMessages(prev => [...prev, data.message]);
        lastMessageTime.current = data.message.created_at;
      }
      setInput('');
      setReplyTo(null);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/react`, { emoji });
      fetchMessages();
    } catch {}
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post('/channels', { name: newChannelName, description: newChannelDesc });
      addToast('Channel created');
      setShowNewChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      fetchChannels();
      navigate(`/chat/${data.channel.id}`);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this channel?')) return;
    try {
      await api.put(`/channels/${id}/archive`);
      addToast('Channel archived');
      fetchChannels();
      if (channelId === id) navigate('/chat');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const activeChannel = channels.find(c => c.id === channelId);

  return (
    <div className="flex h-screen">
      {/* Channel sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Channels</h2>
          {isAdmin && (
            <button onClick={() => setShowNewChannel(!showNewChannel)}
              className="text-gold hover:text-gold-dark text-lg font-bold" title="New channel">+</button>
          )}
        </div>

        {showNewChannel && (
          <form onSubmit={handleCreateChannel} className="p-3 border-b border-gray-200 bg-gray-50">
            <input type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
              placeholder="channel-name" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2" required />
            <input type="text" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)}
              placeholder="Description (optional)" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2" />
            <div className="flex gap-2">
              <button type="submit" className="bg-navy text-white px-3 py-1 rounded text-xs">Create</button>
              <button type="button" onClick={() => setShowNewChannel(false)} className="text-xs text-gray-500">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-8 text-center">No channels yet</p>
          ) : (
            channels.map(ch => (
              <div key={ch.id}
                onClick={() => navigate(`/chat/${ch.id}`)}
                className={`flex items-center justify-between px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  ch.id === channelId ? 'bg-navy/5 text-navy font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <span className="truncate"># {ch.name}</span>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); handleArchive(ch.id); }}
                    className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100" title="Archive">×</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900"># {activeChannel.name}</h3>
              {activeChannel.description && (
                <p className="text-sm text-gray-500 mt-0.5">{activeChannel.description}</p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageItem key={msg.id} msg={msg}
                      onReply={setReplyTo} onReact={handleReact}
                      currentUserId={user.id} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded">
                  <span>Replying to <strong>{replyTo.author_name}</strong></span>
                  <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 ml-auto">✕</button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder={`Message #${activeChannel.name}...`}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold text-sm" />
                <button type="submit" disabled={!input.trim()}
                  className="bg-navy hover:bg-navy-light text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30 transition-colors">
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-700">Select a channel</h3>
              <p className="text-gray-500 mt-1 text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
