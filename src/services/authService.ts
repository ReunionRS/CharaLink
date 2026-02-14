import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export type OnlineVisibility = 'contacts' | 'everyone' | 'selected' | 'nobody';

export type OnlineVisibility = 'contacts' | 'everyone' | 'selected' | 'nobody';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  theme?: 'light' | 'dark';
  onlineVisibility?: OnlineVisibility;
  visibleToUsers?: string[]; // Для опции 'selected'
  createdAt: number;
  updatedAt: number;
}

export const authService = {
  // Email/Password authentication
  async signIn(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async signUp(email: string, password: string, displayName: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: result.user.uid,
      displayName,
      email,
      theme: 'light',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await setDoc(doc(db, 'users', result.user.uid), userProfile);
    return result.user;
  },

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || 'User',
        email: result.user.email || '',
        photoURL: result.user.photoURL || undefined,
        theme: 'light',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'users', result.user.uid), userProfile);
    }
    
    return result.user;
  },

  async logout() {
    await signOut(auth);
  },

  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  },

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    await setDoc(
      doc(db, 'users', uid),
      { ...updates, updatedAt: Date.now() },
      { merge: true }
    );
  },
};

