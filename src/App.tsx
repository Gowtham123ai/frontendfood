import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, orderBy, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, MenuItem, CartItem, Order } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import MenuView from './views/MenuView';
import CartView from './views/CartView';
import OrdersView from './views/OrdersView';
import DeliveryView from './views/DeliveryView';
import AddressView from './views/AddressView';
import { Toaster } from 'react-hot-toast';

import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import CustomCursor from './components/CustomCursor';
import NotificationListener from './components/NotificationListener';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [language, setLanguage] = useState<'en' | 'ta'>('en');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔐 Auth State Changed:", firebaseUser?.email || "No User");
      if (firebaseUser) {
        // AUTO-ELEVATE MASTER ADMIN
        const adminEmails = ['admin@admin.com', 'srimonikdfdsahgjghgj54@gmail.com'];
        if (adminEmails.includes(firebaseUser.email || '')) {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            role: 'admin',
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Dev Admin',
            uid: firebaseUser.uid,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUser(profile);
        } else {
          // If profile doesn't exist yet, create a default user profile
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'user',
            phone: '',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUser(newProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Safety timeout for loading
    const timer = setTimeout(() => setLoading(false), 5000);

    const q = collection(db, 'menu');
    console.log("📡 Listening to collection: 'menu'...");
    const unsubscribeMenu = onSnapshot(q, (snapshot) => {
      console.log("🔥 MENU DATA RAW SNAPSHOT:", snapshot.size, "docs");
      const menuData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📄 Doc ID: ${doc.id}`, data);
        return {
          id: doc.id,
          ...data,
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true
        } as MenuItem;
      });
      console.log("🔥 FINAL MENU DATA:", menuData);
      setMenu(menuData);

      // FINAL QUICK TEST as requested
      if (typeof window !== 'undefined') {
        // alert("Documents in 'menu' collection: " + snapshot.size);
      }
    }, (error) => {
      console.error("❌ Firestore Menu Error:", error);
      handleFirestoreError(error, OperationType.GET, 'menu');
    });

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      unsubscribeMenu();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView('menu');
    setCart([]);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderView = () => {
    if (currentView === 'login' && !user) {
      return <Auth onAuthSuccess={(profile) => { setUser(profile); setCurrentView('menu'); }} />;
    }

    switch (currentView) {
      case 'menu':
        return <MenuView menu={menu} onAddToCart={addToCart} language={language} setLanguage={setLanguage} user={user} />;
      case 'delivery':
        return user?.role === 'delivery_person' ? <DeliveryView /> : <MenuView menu={menu} onAddToCart={addToCart} language={language} setLanguage={setLanguage} user={user} />;
      case 'cart':
        return <CartView cart={cart} onUpdateQty={updateCartQuantity} onRemove={removeFromCart} onCheckoutSuccess={() => { setCart([]); setCurrentView('orders'); }} user={user} onNavigate={setCurrentView} />;
      case 'orders':
        return user ? <OrdersView user={user} /> : <Auth onAuthSuccess={(profile) => { setUser(profile); setCurrentView('orders'); }} />;
      case 'address':
        return user ? <AddressView /> : <Auth onAuthSuccess={(profile) => { setUser(profile); setCurrentView('address'); }} />;
      default:
        return <MenuView menu={menu} onAddToCart={addToCart} language={language} setLanguage={setLanguage} user={user} />;
    }
  };

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      onNavigate={setCurrentView}
      currentView={currentView}
      cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
    >
      <NotificationListener userRole={user?.role || ''} />
      <CustomCursor />
      <Toaster position="bottom-center" />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
