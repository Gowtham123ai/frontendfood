import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ShoppingCart, LayoutDashboard, Menu as MenuIcon, X, Truck, Sun, Moon, MapPin, ChefHat } from 'lucide-react';
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

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const navItems = [
    { id: 'menu', label: 'Menu', icon: ChefHat, show: true },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, show: user?.role === 'user' },
    { id: 'address', label: 'Addresses', icon: MapPin, show: user?.role === 'user' },
    { id: 'admin', label: 'Admin', icon: LayoutDashboard, show: user?.role === 'admin' || user?.role === 'manager' },
    { id: 'delivery', label: 'Deliveries', icon: Truck, show: user?.role === 'delivery_person' },
  ];

  return (
    <div className="min-h-screen font-sans transition-colors duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── TOP NAV ── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* LOGO */}
            <button onClick={() => onNavigate('menu')} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40 group-hover:scale-110 transition-transform">
                <span className="text-white font-black text-lg">M</span>
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-black text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>MAGIZHAMUDHU</span>
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--brand)' }}>Kitchen</span>
              </div>
            </button>

            {/* DESKTOP NAV */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.filter(i => i.show).map(item =>
                item.id === 'admin' ? (
                  <a key={item.id} href="/admin.html"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                    <item.icon size={16} />
                    {item.label}
                  </a>
                ) : (
                  <button key={item.id} onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      currentView === item.id
                        ? 'text-orange-500 bg-orange-500/10'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{ color: currentView === item.id ? undefined : 'var(--text-muted)' }}>
                    <item.icon size={16} />
                    {item.label}
                  </button>
                )
              )}
            </div>

            {/* RIGHT SIDE */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle */}
              <button onClick={() => setIsDark(!isDark)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 transition-all">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {user ? (
                <div className="relative">
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-4 rounded-2xl border hover:border-orange-500/40 transition-all group"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.name}&background=f97316&color=fff&bold=true`}
                      className="w-8 h-8 rounded-lg"
                      alt={user.name}
                    />
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                      <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{user.role}</span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      >
                        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Signed in as</p>
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
                        </div>
                        <div className="p-2">
                          <button onClick={() => { onNavigate('orders'); setIsProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}>
                            <ShoppingCart size={15} /> My Orders
                          </button>
                          <button onClick={onLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm font-bold">
                            <LogOut size={15} /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button onClick={() => onNavigate('login')} className="btn-brand text-sm px-5 py-2.5">
                  Sign In
                </button>
              )}
            </div>

            {/* MOBILE RIGHT */}
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <button onClick={() => onNavigate('cart')} className="relative p-2 text-zinc-400">
                  <ShoppingCart size={22} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all">
                {isMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE DROPDOWN */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.filter(i => i.show).map(item =>
                  item.id === 'admin' ? (
                    <a key={item.id} href="/admin.html"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 font-medium text-sm">
                      <item.icon size={18} /> {item.label}
                    </a>
                  ) : (
                    <button key={item.id}
                      onClick={() => { onNavigate(item.id); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                        currentView === item.id ? 'text-orange-500 bg-orange-500/10' : 'text-zinc-300 hover:bg-white/5'
                      }`}>
                      <item.icon size={18} /> {item.label}
                    </button>
                  )
                )}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  {user ? (
                    <button onClick={onLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 font-semibold text-sm">
                      <LogOut size={18} /> Logout
                    </button>
                  ) : (
                    <button onClick={() => onNavigate('login')} className="btn-brand w-full text-sm">Sign In</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 mt-auto border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          &copy; {new Date().getFullYear()} MAGIZHAMUDHU KITCHEN
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="/privacy.html" className="text-xs hover:text-orange-500 transition-colors" style={{ color: 'var(--text-muted)' }}>
            Privacy Policy
          </a>
        </div>
      </footer>

      {/* FLOATING CART */}
      {user && user.role === 'user' && currentView !== 'cart' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => onNavigate('cart')}
          className="fixed bottom-8 right-8 btn-brand hidden md:flex items-center gap-3 z-40 pr-6 pl-5 py-4 rounded-2xl text-base"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-orange-600">
                {cartCount}
              </span>
            )}
          </div>
          <span className="font-black tracking-tight">View Cart</span>
        </motion.button>
      )}
    </div>
  );
}
