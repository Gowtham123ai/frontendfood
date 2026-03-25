import React from 'react';
import { LayoutDashboard, ShoppingBag, Menu as MenuIcon, Users, PieChart, LogOut, Settings, Truck } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
  userRole: string;
  isDark?: boolean;
}

export default function Sidebar({ currentTab, onNavigate, onLogout, userRole, isDark = true }: SidebarProps) {
  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { id: 'menu',      label: 'Menu',      icon: MenuIcon },
    { id: 'users',     label: 'Users',     icon: Users, reqAdmin: true },
    { id: 'delivery',  label: 'Delivery',  icon: Truck },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings',  label: 'Settings',  icon: Settings, reqAdmin: true },
  ];

  const textPrimary  = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted    = isDark ? '#64748b'  : '#64748b';
  const hoverBg      = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const borderColor  = isDark ? '#1e293b'  : '#e2e8f0';

  return (
    <div
      className="w-64 h-full flex flex-col p-6 z-10 sticky top-0 transition-colors duration-300"
      style={{
        background: isDark ? '#020617' : '#ffffff',
        borderRight: `1px solid ${borderColor}`,
      }}
    >
      {/* LOGO */}
      <div className="flex items-center gap-3 mb-12 mt-2 px-2">
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-600/30">
          M
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tight truncate uppercase" style={{ color: textPrimary }}>
            MAGIZHAMUDHU
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-500">Kitchen</span>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-1">
        {adminTabs
          .filter(tab => !tab.reqAdmin || userRole === 'admin')
          .map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm"
              style={
                currentTab === tab.id
                  ? { background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }
                  : { color: textMuted }
              }
              onMouseEnter={e => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.background = hoverBg;
                  e.currentTarget.style.color = textPrimary;
                }
              }}
              onMouseLeave={e => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = textMuted;
                }
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
      </nav>

      {/* LOGOUT */}
      {onLogout && (
        <div className="pt-4 mt-auto" style={{ borderTop: `1px solid ${borderColor}` }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-500/10 font-medium text-sm"
          >
            <LogOut size={20} />
            Exit Admin
          </button>
        </div>
      )}
    </div>
  );
}
