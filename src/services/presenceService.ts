import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

export type OnlineVisibility = 'contacts' | 'everyone' | 'selected' | 'nobody';

export interface PresenceData {
  userId: string;
  isOnline: boolean;
  lastSeen: number;
  visibility: OnlineVisibility;
  visibleTo?: string[]; // Для опции 'selected'
}

export const presenceService = {
  // Set user online status
  async setOnlineStatus(userId: string, isOnline: boolean) {
    const presenceRef = doc(db, 'presence', userId);
    await setDoc(presenceRef, {
      isOnline,
      lastSeen: Date.now(),
      timestamp: serverTimestamp(),
    }, { merge: true });
  },

  // Subscribe to user's online status
  subscribeToPresence(userId: string, callback: (presence: PresenceData | null) => void) {
    const presenceRef = doc(db, 'presence', userId);
    
    return onSnapshot(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          userId,
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || Date.now(),
          visibility: data.visibility || 'everyone',
          visibleTo: data.visibleTo || [],
        });
      } else {
        callback(null);
      }
    });
  },

  // Initialize presence tracking
  initializePresence(userId: string) {
    // Set online when user logs in
    this.setOnlineStatus(userId, true);

    // Set offline when user closes tab/window
    const handleBeforeUnload = () => {
      this.setOnlineStatus(userId, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set offline when user disconnects
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        this.setOnlineStatus(userId, false);
      }
    });

    // Heartbeat to keep user online
    const heartbeatInterval = setInterval(() => {
      this.setOnlineStatus(userId, true);
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      this.setOnlineStatus(userId, false);
    };
  },

  // Update visibility settings
  async updateVisibility(userId: string, visibility: OnlineVisibility, visibleTo?: string[]) {
    const presenceRef = doc(db, 'presence', userId);
    await setDoc(presenceRef, {
      visibility,
      visibleTo: visibleTo || [],
    }, { merge: true });
  },

  // Check if current user can see other user's online status
  canSeeOnlineStatus(
    otherUserId: string,
    otherUserVisibility: OnlineVisibility,
    otherUserVisibleTo: string[] = [],
    currentUserId: string,
    areContacts: boolean = false
  ): boolean {
    if (otherUserVisibility === 'everyone') return true;
    if (otherUserVisibility === 'nobody') return false;
    if (otherUserVisibility === 'contacts' && areContacts) return true;
    if (otherUserVisibility === 'selected' && otherUserVisibleTo.includes(currentUserId)) return true;
    return false;
  },
};

