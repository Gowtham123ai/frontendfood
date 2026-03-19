import React from 'react';
import { LayoutDashboard, ShoppingBag, Menu as MenuIcon, Users, PieChart, LogOut, Settings, Truck } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
  userRole: string;
}

export default function Sidebar({ currentTab, onNavigate, onLogout, userRole }: SidebarProps) {
  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: MenuIcon },
    { id: 'users', label: 'Users', icon: Users, reqAdmin: true },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings, reqAdmin: true },
  ];

  return (
    <div className="w-64 bg-[#020617] border-r border-slate-900 h-full flex flex-col p-6 z-10 sticky top-0 h-screen text-slate-400">
      <div className="flex items-center gap-3 mb-12 mt-2 px-2">
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-600/20">
          F
        </div>
        <span className="text-2xl font-black tracking-tighter text-white truncate uppercase">
          MAGIZHAMUDHU
        </span>
      </div>

      <nav className="flex-1 space-y-2">
        {adminTabs
          .filter(tab => !tab.reqAdmin || userRole === 'admin')
          .map(tab => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentTab === tab.id
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
      </nav>

      {onLogout && (
        <div className="pt-4 border-t border-slate-800 mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-500/10 font-medium"
          >
            <LogOut size={20} />
            Exit Admin
          </button>
        </div>
      )}
    </div>
  );
}
