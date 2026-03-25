import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Dashboard from './Dashboard';
import MenuPage from './MenuPage';
import OrdersPage from './OrdersPage';
import UsersPage from './UsersPage';
import AnalyticsPage from './AnalyticsPage';
import DeliveryPage from './DeliveryPage';
import SettingsPage from './SettingsPage';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Bell, UserCircle, Sun, Moon } from 'lucide-react';
import { ThemeContext } from './ThemeContext';

interface AdminLayoutProps {
  userRole: string;
  onExitAdmin: () => void;
}

export default function AdminLayout({ userRole, onExitAdmin }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    // Also update body background for admin panel
    document.body.style.background = isDark ? '#0f172a' : '#f8f8f5';
  }, [isDark]);

  React.useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'Pending'));
    const unsub = onSnapshot(q, (snap) => {
        setPendingCount(snap.docs.length);
    });
    return () => unsub();
  }, []);

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-red-500 font-bold">
        Access Denied
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userRole={userRole} />;
      case 'menu':
        return <MenuPage userRole={userRole} />;
      case 'orders':
        return <OrdersPage userRole={userRole} />;
      case 'users':
        if (userRole === 'admin') return <UsersPage userRole={userRole} />;
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
      case 'analytics':
        return <AnalyticsPage userRole={userRole} />;
      case 'delivery':
        return <DeliveryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard userRole={userRole} />;
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden w-full fixed inset-0 z-[60] transition-colors duration-300"
      style={{ background: isDark ? '#0f172a' : '#f1f0ec', color: isDark ? '#f1f5f9' : '#0f0f0f' }}
    >
      <Sidebar
        currentTab={activeTab}
        onNavigate={setActiveTab}
        onLogout={onExitAdmin}
        userRole={userRole}
        isDark={isDark}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 border-b flex items-center justify-between px-8 transition-colors duration-300"
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
            color: isDark ? '#cbd5e1' : '#334155'
          }}
        >
          <div
            className="flex px-4 py-2 rounded-lg items-center gap-2 border w-96"
            style={{ background: isDark ? '#0f172a' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' }}
          >
            <Search size={18} className="text-slate-500" />
            <input type="text" placeholder="Search orders, items..." className="bg-transparent border-none outline-none w-full text-sm text-white" />
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: isDark ? '#facc15' : '#64748b'
              }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Bell */}
            <button
              onClick={() => setActiveTab('orders')}
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#1e293b]">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* User */}
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4 cursor-pointer hover:bg-slate-800 px-3 py-1 rounded-xl transition-all">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white capitalize">{userRole}</p>
                <p className="text-xs text-slate-500">Admin Area</p>
              </div>
              <UserCircle size={32} className="text-slate-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative">
          {activeTab !== 'dashboard' && (
            <div className="mb-8">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500 mb-1">✦ Admin Panel</p>
              <h1 className="text-4xl font-black tracking-tight capitalize" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{activeTab}</h1>
            </div>
          )}
          <ThemeContext.Provider value={isDark}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
          </ThemeContext.Provider>
        </main>
      </div>
    </div>
  );
}
