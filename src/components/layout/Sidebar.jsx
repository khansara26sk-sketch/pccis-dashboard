import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  FileText,
  History,
  BarChart3,
  Scale,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/new-inspection', label: 'New Inspection', icon: ScanLine, highlight: true },
  { path: '/ocr-results', label: 'OCR Results', icon: FileText },
  { path: '/history', label: 'Inspection History', icon: History },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/rules', label: 'Compliance Rules', icon: Scale },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { user } = useAuth();

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
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out flex flex-col bg-white dark:bg-[#141D17] border-r border-[#E5EDE6] dark:border-[#29382D] ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 justify-between border-b border-[#E5EDE6] dark:border-[#29382D]">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-[#15803D] dark:bg-[#22C55E] flex items-center justify-center text-white dark:text-[#101713] shrink-0 shadow-sm shadow-[#15803D]/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] leading-none">
                  PCCIS
                </span>
                <span className="text-[10px] uppercase font-semibold text-[#15803D] dark:text-[#4ADE80] tracking-wider mt-1 truncate">
                  Legal Metrology AI
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                    isActive
                      ? 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] font-semibold shadow-xs'
                      : 'text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#15803D] dark:text-[#4ADE80]'
                          : 'text-[#647067] group-hover:text-[#17211B] dark:text-[#A3B3A6] dark:group-hover:text-[#F0FDF4]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {item.highlight && !isCollapsed && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] font-bold border border-[#E5EDE6] dark:border-[#29382D]">
                        AI
                      </span>
                    )}
                    {/* Tooltip in collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-2 py-1 rounded-md bg-[#17211B] dark:bg-[#F0FDF4] text-white dark:text-[#101713] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md z-50">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Regulatory Banner in Sidebar */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mb-3 rounded-xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            <div className="flex items-center gap-1.5 font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1">
              <Scale className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80] shrink-0" />
              <span>Standard Compliance</span>
            </div>
            <p className="leading-tight text-[10px] text-[#647067] dark:text-[#A3B3A6]">
              Legal Metrology (Packaged Commodities) Rules, 2011 standard reference engine.
            </p>
          </div>
        )}

        {/* User Profile Card at Bottom */}
        <div className="p-3 border-t border-[#E5EDE6] dark:border-[#29382D]">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40 transition-colors">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-[#15803D] to-[#166534] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] ring-2 ring-white dark:ring-[#141D17]"></span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#647067] dark:text-[#A3B3A6] truncate">
                  {displayRole}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
