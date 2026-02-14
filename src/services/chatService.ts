import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  unreadCount?: { [userId: string]: number };
  createdAt: number;
  updatedAt: number;
  avatar?: string;
  description?: string;
  createdBy?: string;
}

export const chatService = {
  // Create a new chat
  async createChat(
    type: 'direct' | 'group' | 'channel',
    participants: string[],
    name?: string,
    createdBy?: string
  ): Promise<string> {
    const chatData: any = {
      type,
      participants,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Добавляем name только если он определен
    if (name) {
      chatData.name = name;
    }
    
    // Добавляем createdBy только если он определен
    if (createdBy) {
      chatData.createdBy = createdBy;
    }

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  },

  // Get user chats
  async getUserChats(userId: string): Promise<Chat[]> {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[];
  },

  // Subscribe to user chats
  subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      callback(chats);
    });
  },

  // Send a message
  async sendMessage(chatId: string, senderId: string, text: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string) {
    const messageData: any = {
      chatId,
      senderId,
      text,
      timestamp: Date.now(),
      read: false,
      type,
    };
    
    // Добавляем fileUrl только если он определен
    if (fileUrl) {
      messageData.fileUrl = fileUrl;
    }

    const messageRef = await addDoc(collection(db, 'messages'), messageData);

    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: {
        text,
        timestamp: Date.now(),
        senderId,
      },
      updatedAt: Date.now(),
    });

    return messageRef.id;
  },

  // Subscribe to chat messages
  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      callback(messages);
    });
  },

  // Mark messages as read
  async markMessagesAsRead(chatId: string, userId: string) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );
    await Promise.all(batch);
  },

  // Get or create direct chat
  async getOrCreateDirectChat(userId1: string, userId2: string): Promise<string> {
    if (userId1 === userId2) {
      throw new Error('Cannot create chat with yourself');
    }
    
    const participants = [userId1, userId2].sort();
    
    // Check if direct chat already exists
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'direct')
    );
    const snapshot = await getDocs(q);

    // Find chat with matching participants
    const existingChat = snapshot.docs.find((doc) => {
      const data = doc.data();
      const chatParticipants = (data.participants || []).sort();
      return (
        chatParticipants.length === 2 &&
        chatParticipants[0] === participants[0] &&
        chatParticipants[1] === participants[1]
      );
    });

    if (existingChat) {
      return existingChat.id;
    }

    // Create new direct chat with both participants
    const chatId = await this.createChat('direct', participants);
    
    // Verify chat was created
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      throw new Error('Failed to create chat');
    }
    
    return chatId;
  },
};

