import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCVtlnwwixerXNJvteauqwRqf9tf_XT0II",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "messengercosp.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "messengercosp",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "messengercosp.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "659963824003",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:659963824003:web:bdbf0a92b8885414ead8b6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GP5919YFCK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (только для браузера)
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics не инициализирован:', error);
  }
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// ReCAPTCHA verifier for phone authentication
export const setupRecaptcha = (elementId: string) => {
  return new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });
};

export { PhoneAuthProvider, signInWithCredential };
export default app;

