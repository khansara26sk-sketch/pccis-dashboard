import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Bell,
  Search,
  Menu,
  CheckCircle2,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { checkBackendHealth } from '../../services/inspectionService';

const pageMeta = {
  '/dashboard': { title: 'Overview Dashboard', section: 'System' },
  '/new-inspection': { title: 'New Package Inspection', section: 'Compliance Audit' },
  '/inspection/new': { title: 'New Package Inspection', section: 'Compliance Audit' },
  '/history': { title: 'Inspection History', section: 'Records' },
  '/reports': { title: 'Compliance Reports & Analytics', section: 'Intelligence' },
  '/rules': { title: 'Compliance Rules Directory', section: 'Legal Metrology' },
  '/settings': { title: 'System & Inspector Settings', section: 'Preferences' },
};

export default function Navbar({ onMobileMenuClick, isCollapsed }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentMeta = pageMeta[location.pathname] || { title: 'PCCIS Inspection Suite', section: 'System' };

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then(res => {
      if (isMounted) setIsBackendOnline(res.online);
    });
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/history?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Inspector';
  const displayRole = user?.role || 'Legal Metrology Officer';
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'LM';
  };
  const initials = getInitials(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#141D17]/90 backdrop-blur-md border-b border-[#E5EDE6] dark:border-[#29382D] px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-xl text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            <span>PCCIS</span>
            <span>/</span>
            <span className="font-medium text-[#17211B] dark:text-[#F0FDF4]">{currentMeta.section}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] leading-tight">
            {currentMeta.title}
          </h1>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center max-w-xs w-full relative">
        <Search className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search package, ID, rule..."
          className="w-full pl-9 pr-9 py-1.5 text-xs rounded-xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] focus:border-[#15803D] dark:focus:border-[#4ADE80] text-[#17211B] dark:text-[#F0FDF4] placeholder:text-[#647067] dark:placeholder:text-[#A3B3A6] transition-all outline-none"
        />
        <div className="absolute right-2.5 flex items-center gap-0.5 text-[10px] text-[#647067] dark:text-[#A3B3A6] bg-[#E5EDE6]/60 dark:bg-[#29382D] px-1.5 py-0.5 rounded font-mono">
          ↵
        </div>
      </form>

      {/* Right Controls: API status, Theme Toggle, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend status pill */}
        <div
          title={isBackendOnline ? 'FastAPI Backend Connected (127.0.0.1:8000)' : 'FastAPI Backend Disconnected (127.0.0.1:8000)'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isBackendOnline
              ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#173D26] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]'
              : 'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20'
          }`}
        >
          {isBackendOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] animate-pulse"></span>
              <span>FastAPI Live</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
              <span>Backend Offline</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors relative"
          aria-label="Toggle theme"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-[#4ADE80]" /> : <Moon className="w-4 h-4 text-[#15803D]" />}
        </button>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-xl py-3 px-4 z-50">
              <div className="pb-2 border-b border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">Notifications</span>
                <span className="text-[10px] text-[#647067] dark:text-[#A3B3A6]">Live Feed</span>
              </div>
              <div className="py-6 text-center">
                <div className="w-9 h-9 rounded-full bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-[#17211B] dark:text-[#F0FDF4]">
                  No unread notifications
                </p>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-1 max-w-[220px] mx-auto">
                  Alerts for OCR infractions and package verdicts will appear here in real time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#15803D] dark:bg-[#22C55E] text-white dark:text-[#101713] flex items-center justify-center text-xs font-bold shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left max-w-[120px]">
              <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] leading-none truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-[#647067] dark:text-[#A3B3A6] mt-0.5 leading-none truncate">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#647067] dark:text-[#A3B3A6]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-xl py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-[#E5EDE6] dark:border-[#29382D]">
                <p className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] truncate">{displayName}</p>
                <p className="text-[10px] text-[#647067] dark:text-[#A3B3A6] truncate">{user?.email || 'Officer Portal'}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#17211B] dark:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]"
              >
                <Settings className="w-3.5 h-3.5 text-[#647067] dark:text-[#A3B3A6]" />
                <span>Account Settings</span>
              </Link>
              <Link
                to="/rules"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#17211B] dark:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]"
              >
                <User className="w-3.5 h-3.5 text-[#647067] dark:text-[#A3B3A6]" />
                <span>Regulatory Rules</span>
              </Link>
              <div className="my-1 border-t border-[#E5EDE6] dark:border-[#29382D]" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
