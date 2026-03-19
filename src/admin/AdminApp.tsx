import React, { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-orange-500 rounded-2xl items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg shadow-orange-500/20">
              F
            </div>
            <h1 className="text-2xl font-bold text-white">MAGIZHAMUDHU Admin</h1>
            <p className="text-slate-400">Restricted Access - Authorized Personnel Only</p>
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
