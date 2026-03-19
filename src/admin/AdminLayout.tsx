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
import { Search, Bell, UserCircle } from 'lucide-react';

interface AdminLayoutProps {
  userRole: string;
  onExitAdmin: () => void;
}

export default function AdminLayout({ userRole, onExitAdmin }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);

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
    <div className="flex h-screen bg-[#0f172a] overflow-hidden w-full fixed inset-0 z-[60]">
      <Sidebar
        currentTab={activeTab}
        onNavigate={setActiveTab}
        onLogout={onExitAdmin}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#1e293b] border-b border-slate-800 flex items-center justify-between px-8 text-slate-300">
          <div className="flex bg-slate-900 px-4 py-2 rounded-lg items-center gap-2 border border-slate-700 w-96">
            <Search size={18} className="text-slate-500" />
            <input type="text" placeholder="Search orders, items..." className="bg-transparent border-none outline-none w-full text-sm text-white" />
          </div>
          <div className="flex items-center gap-6">
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
            <div className="flex items-center gap-3 border-l border-slate-700 pl-6 cursor-pointer hover:bg-slate-800 px-3 py-1 rounded-xl transition-all">
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
            <h1 className="text-4xl font-black text-white mb-8 capitalize tracking-tight">{activeTab}</h1>
          )}
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
        </main>
      </div>
    </div>
  );
}
