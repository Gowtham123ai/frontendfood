import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import AdminLayout from './AdminLayout';
import Auth from '../components/Auth';
import { Toaster } from 'react-hot-toast';
import NotificationListener from '../components/NotificationListener';

export default function AdminApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // AUTO-ELEVATE FOR LOCAL TESTING to enforce correct Firestore document format
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          role: 'admin',
          email: firebaseUser.email || 'tester@local.com',
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Admin'
        }, { merge: true });

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          if (profile.role === 'admin' || profile.role === 'manager') {
            setUser(profile);
          } else {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true; // Default dark for admin
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newMode;
    });
  };

  // Enforce the initial body/HTML classes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`absolute top-6 right-6 p-3 rounded-xl transition-all ${
            isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white shadow-md text-slate-600 hover:text-orange-500'
          }`}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-orange-500 rounded-2xl items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg shadow-orange-500/20">
              F
            </div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>MAGIZHAMUDHU Admin</h1>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Restricted Access - Authorized Personnel Only</p>
          </div>
          <Auth
            onAuthSuccess={(profile) => setUser(profile)}
            adminOnly={true}
          />
          <Toaster position="bottom-center" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-center" />
      <NotificationListener userRole={user.role} />
      <AdminLayout
        userRole={user.role}
        onExitAdmin={() => window.location.href = '/'}
      />
    </>
  );
}
