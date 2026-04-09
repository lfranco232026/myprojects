import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const navItems = [
  { to: '/', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/chat', icon: '💬', label: 'Chat' },
  { to: '/vault', icon: '📁', label: 'Vault' },
  { to: '/members', icon: '👥', label: 'Members' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    api.get('/announcements').then(data => {
      setUnreadCount(data.unread_count);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-navy text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-navy font-bold text-sm flex-shrink-0">
            S
          </div>
          {sidebarOpen && <span className="font-semibold text-lg tracking-tight">Signal</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-white/15 text-gold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <span className="flex-1">{item.label}</span>
              )}
              {sidebarOpen && item.to === '/' && unreadCount > 0 && (
                <span className="bg-gold text-navy text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center text-gold text-sm font-semibold flex-shrink-0">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-white/50">{isAdmin ? 'Admin' : 'Member'}</p>
              </div>
              <button onClick={handleLogout} className="text-white/50 hover:text-white text-sm" title="Logout">
                ↪
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="text-white/50 hover:text-white text-lg w-full text-center" title="Logout">
              ↪
            </button>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white/50 hover:text-white text-center border-t border-white/10 text-xs"
        >
          {sidebarOpen ? '◀ Collapse' : '▶'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
