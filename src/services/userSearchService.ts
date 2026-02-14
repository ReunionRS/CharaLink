import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from './authService';

export const userSearchService = {
  // Search users by username (email prefix or displayName)
  async searchUsers(searchQuery: string, currentUserId: string): Promise<UserProfile[]> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const queryLower = searchQuery.toLowerCase().trim();
    // Remove @ if present
    const cleanQuery = queryLower.startsWith('@') ? queryLower.slice(1) : queryLower;

    try {
      const usersRef = collection(db, 'users');
      
      // Search by email prefix (username part before @)
      const emailQuery = query(
        usersRef,
        where('email', '>=', cleanQuery),
        where('email', '<=', cleanQuery + '\uf8ff'),
        limit(20)
      );
      
      const emailSnapshot = await getDocs(emailQuery);
      const results: UserProfile[] = [];
      const seenIds = new Set<string>();

      // Add results from email search
      emailSnapshot.forEach((doc) => {
        const user = doc.data() as UserProfile;
        if (user.uid !== currentUserId && !seenIds.has(user.uid)) {
          // Check if email prefix matches
          const emailPrefix = user.email.split('@')[0].toLowerCase();
          if (emailPrefix.includes(cleanQuery)) {
            results.push(user);
            seenIds.add(user.uid);
          }
        }
      });

      // Also search by displayName
      const displayNameQuery = query(
        usersRef,
        where('displayName', '>=', cleanQuery),
        where('displayName', '<=', cleanQuery + '\uf8ff'),
        limit(20)
      );
      
      const displayNameSnapshot = await getDocs(displayNameQuery);
      displayNameSnapshot.forEach((doc) => {
        const user = doc.data() as UserProfile;
        if (user.uid !== currentUserId && !seenIds.has(user.uid)) {
          const displayNameLower = user.displayName.toLowerCase();
          if (displayNameLower.includes(cleanQuery)) {
            results.push(user);
            seenIds.add(user.uid);
          }
        }
      });

      return results.slice(0, 20); // Limit to 20 results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Get user by username (email prefix)
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '>=', cleanUsername), where('email', '<=', cleanUsername + '\uf8ff'));
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const user = doc.data() as UserProfile;
        const emailPrefix = user.email.split('@')[0].toLowerCase();
        if (emailPrefix === cleanUsername.toLowerCase()) {
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  },
};

