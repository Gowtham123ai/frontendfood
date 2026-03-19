import { initializeApp } from 'firebase/app';
import { getAuth, initializeRecaptchaConfig } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Required for Firebase v12 + Identity Platform: initializes reCAPTCHA Enterprise
// This must be called once at app startup BEFORE any phone sign-in
if (typeof window !== 'undefined') {
  initializeRecaptchaConfig(auth).then(() => {
    console.log('✅ reCAPTCHA Enterprise config initialized');
  }).catch((err) => {
    console.warn('⚠️ reCAPTCHA config init failed (non-blocking):', err);
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
