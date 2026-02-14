import { doc, setDoc, deleteDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const typingService = {
  // Set typing status
  async setTyping(chatId: string, userId: string, isTyping: boolean) {
    const typingRef = doc(db, 'chats', chatId, 'typing', userId);
    
    if (isTyping) {
      await setDoc(typingRef, {
        userId,
        timestamp: Date.now(),
      }, { merge: true });
    } else {
      try {
        await deleteDoc(typingRef);
      } catch (error) {
        // Игнорируем ошибку если документа нет
      }
    }
  },

  // Subscribe to typing status
  subscribeToTyping(chatId: string, callback: (typingUsers: string[]) => void) {
    const typingCollection = collection(db, 'chats', chatId, 'typing');
    const q = query(typingCollection);
    
    return onSnapshot(q, (snapshot) => {
      const typingUsers = snapshot.docs.map((doc) => {
        const data = doc.data();
        return data.userId as string;
      }).filter(Boolean);
      callback(typingUsers);
    });
  },
};

