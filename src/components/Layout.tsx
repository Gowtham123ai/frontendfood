import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, ShoppingCart, LayoutDashboard, Menu as MenuIcon, X, Truck, Moon, Sun, MapPin } from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
  cartCount: number;
}

export default function Layout({ children, user, onLogout, onNavigate, currentView, cartCount }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(true);

  const navItems = [
    { id: 'menu', label: 'Menu', icon: MenuIcon, show: true },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart, show: user?.role === 'user' },
    { id: 'address', label: 'My Addresses', icon: MapPin, show: user?.role === 'user' },
    { id: 'admin', label: 'Admin Panel', icon: LayoutDashboard, show: user?.role === 'admin' || user?.role === 'manager' },
    { id: 'delivery', label: 'Deliveries', icon: Truck, show: user?.role === 'delivery_person' },
  ];

  const hour = new Date().getHours();
  let timeTheme = "theme-evening";
  if (hour < 11) timeTheme = "theme-morning";
  else if (hour < 16) timeTheme = "theme-afternoon";
  else if (hour < 21) timeTheme = "theme-evening";
  else timeTheme = "theme-night";

  const getThemeClass = () => {
    if (!isDark) return 'bg-slate-50 text-slate-900';
    return `premium-gradient ${timeTheme} text-slate-200`;
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${getThemeClass()}`}>
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 ${isDark ? 'premium-glass border-white/10' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('menu')}>
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-600/20">
                F
              </div>
              <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
                MAGIZHAMUDHU
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-yellow-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {navItems.filter(item => item.show).map((item) => (
                item.id === 'admin' ? (
                  <a
                    key={item.id}
                    href="/admin.html"
                    className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-orange-500 transition-colors"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </a>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentView === item.id ? 'text-orange-500' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                )
              ))}

              {user ? (
                <div className="relative flex items-center gap-4 pl-4 border-l border-slate-800">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1.5 hover:bg-slate-800/50 rounded-2xl transition-all group"
                  >
                    <div className="flex flex-col items-end hidden lg:flex">
                      <span className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{user.name}</span>
                      <span className="text-[10px] text-slate-500 capitalize tracking-widest">{user.role}</span>
                    </div>
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.name}&background=ff6b00&color=fff&bold=true`}
                      className="w-10 h-10 rounded-xl border-2 border-slate-800 group-hover:border-orange-500 transition-all shadow-lg"
                      alt="Avatar"
                    />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#1e293b] border border-slate-800 rounded-2xl p-2 shadow-2xl z-[100] backdrop-blur-xl"
                      >
                        <div className="p-3 border-b border-slate-800 mb-2">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Signed in as</p>
                          <p className="text-sm font-bold text-white truncate">{user.email}</p>
                        </div>
                        <button onClick={() => { onNavigate('orders'); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-medium">
                          <ShoppingCart size={16} /> My Orders
                        </button>
                        <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all text-sm font-bold">
                          <LogOut size={16} /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="bg-orange-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 active:scale-95"
                >
                  Sign In
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center gap-4">
              {user && (
                <button onClick={() => onNavigate('cart')} className="relative p-2 text-slate-400">
                  <ShoppingCart size={24} />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400">
                {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-[#1e293b] border-b border-slate-800 px-4 py-4 space-y-4 shadow-2xl"
          >
            {navItems.filter(item => item.show).map((item) => (
              item.id === 'admin' ? (
                <a
                  key={item.id}
                  href="/admin.html"
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 text-slate-300"
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 text-slate-300"
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            ))}
            {user ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-red-500"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-orange-600/20"
              >
                Sign In
              </button>
            )}
          </motion.div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Floating Cart Button for Desktop */}
      {user && user.role === 'user' && currentView !== 'cart' && (
        <motion.button
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: [0, -8, 0] }}
          transition={{
            scale: { type: "spring", stiffness: 260, damping: 20 },
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          }}
          whileHover={{ scale: 1.1, rotate: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onNavigate('cart')}
          className="fixed bottom-8 right-8 bg-orange-600 text-white p-5 rounded-3xl shadow-2xl shadow-orange-600/40 hover:bg-orange-500 transition-all z-40 hidden md:flex items-center gap-4 border-2 border-white/20"
        >
          <div className="relative">
            <ShoppingCart size={28} />
            {cartCount > 0 && (
              <span className="absolute -top-3 -right-3 bg-white text-orange-600 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-600">
                {cartCount}
              </span>
            )}
          </div>
          <span className="font-black text-lg tracking-tight uppercase">View Cart</span>
        </motion.button>
      )}
    </div>
  );
}
