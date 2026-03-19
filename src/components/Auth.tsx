import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut,
  ConfirmationResult,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { motion } from 'framer-motion';
import { Phone, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthProps {
  onAuthSuccess: (user: UserProfile) => void;
  adminOnly?: boolean;
}

export default function Auth({ onAuthSuccess, adminOnly }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        let userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        // Master Admin handling: Ensure recognized emails ALWAYS have the admin role
        const adminEmails = ['admin@admin.com', 'srimonikdfdsahgjghgj54@gmail.com'];
        if (adminEmails.includes(email)) {
          const adminProfile: UserProfile = {
            uid: userCredential.user.uid,
            name: email === 'admin@admin.com' ? 'Master Admin' : 'Dev Admin',
            email,
            phone: '',
            role: 'admin',
            createdAt: userDoc.exists() ? (userDoc.data() as UserProfile).createdAt : new Date().toISOString(),
          };
          if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== 'admin') {
            await setDoc(doc(db, 'users', userCredential.user.uid), adminProfile);
            userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          }
        }

        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          
          if (!userCredential.user.emailVerified && !adminEmails.includes(email)) {
            await signOut(auth);
            toast.error('Please verify your email! Check your inbox. 📧');
            return;
          }

          if (adminOnly && profile.role !== 'admin' && profile.role !== 'manager') {
            await signOut(auth);
            toast.error('Access denied: Unauthorized role');
            return;
          }
          onAuthSuccess(profile);
        } else {
          await signOut(auth);
          toast.error('No role assigned to this user');
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        
        const newUser: UserProfile = {
          uid: userCredential.user.uid,
          name,
          email,
          phone: '',
          role: 'user',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        toast.success('Verification email sent! 📧');
        setIsLogin(true); // Switch to login after signup
        return; // Don't trigger onAuthSuccess yet
      }
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean number: remove ALL spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
    
    // Ensure phone starts with +
    let formattedPhone = cleaned;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + cleaned;
    }

    // India (+91) + 10 digits = 13 characters
    if (formattedPhone.startsWith('+91') && formattedPhone.length < 13) {
      toast.error('Please enter a valid 10-digit mobile number 📱');
      return;
    }
    
    setLoading(true);
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
              if ((window as any).recaptchaVerifier) {
                try { (window as any).recaptchaVerifier.clear(); } catch (e) {}
                (window as any).recaptchaVerifier = null;
              }
            }
          }
        );
      }

      const appVerifier = (window as any).recaptchaVerifier;

      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      toast.success('OTP Sent! 📱');
    } catch (error: any) {
      console.error('Phone auth error:', error);
      // Reset rerender to allow retry
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }

      if (error.code === 'auth/invalid-app-credential') {
        toast.error('App credential error. Check reCAPTCHA config or try a test phone number.');
      } else if (error.code === 'auth/invalid-phone-number') {
        toast.error('Invalid phone number. Use format: +91XXXXXXXXXX');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Phone sign-in is not enabled. Enable it in Firebase Console.');
      } else if (error.code === 'auth/captcha-check-failed') {
        toast.error('reCAPTCHA check failed. Please refresh and try again.');
      } else {
        toast.error(error.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        onAuthSuccess(userDoc.data() as UserProfile);
      } else {
        const newUser: UserProfile = {
          uid: result.user.uid,
          name: 'Phone User',
          email: '',
          phone,
          role: 'user',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
        onAuthSuccess(newUser);
      }
      toast.success('Phone verified!');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-stone-900">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
        <p className="text-stone-500 mt-2">Experience the best cloud kitchen in town</p>
      </div>

      <div className="flex gap-4 mb-8 p-1 bg-stone-100 rounded-2xl">
        <button
          onClick={() => setAuthMethod('email')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            authMethod === 'email' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            authMethod === 'phone' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
          }`}
        >
          Phone
        </button>
      </div>

      {authMethod === 'email' ? (
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-400"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-400"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight size={20} />
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {!confirmationResult ? (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-center text-2xl tracking-widest text-white placeholder-slate-400"
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmationResult(null)}
                className="w-full text-stone-500 text-sm hover:underline"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
      )}

      {!adminOnly && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 font-semibold hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      )}

      {/* 🔹 Fixed reCAPTCHA Container */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
