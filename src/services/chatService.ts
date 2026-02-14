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
  admins?: string[]; // Список ID администраторов
  muted?: { [userId: string]: boolean }; // Пользователи, которые отключили уведомления
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

  // Create group chat
  async createGroupChat(
    creatorId: string,
    participantIds: string[],
    name: string,
    avatar?: string,
    description?: string
  ): Promise<string> {
    if (participantIds.length < 2) {
      throw new Error('Групповой чат должен содержать минимум 2 участника');
    }

    // Убеждаемся, что создатель включен в участники
    const allParticipants = [...new Set([creatorId, ...participantIds])];

    const chatId = await this.createChat('group', allParticipants, name, creatorId);
    
    // Обновляем чат с дополнительными данными
    const chatRef = doc(db, 'chats', chatId);
    const updateData: any = {
      updatedAt: Date.now(),
      admins: [creatorId], // Создатель автоматически становится админом
    };
    
    if (avatar) {
      updateData.avatar = avatar;
    }
    
    if (description) {
      updateData.description = description;
    }
    
    await updateDoc(chatRef, updateData);
    
    return chatId;
  },

  // Add participants to group chat
  async addParticipantsToGroup(chatId: string, userIds: string[]): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data() as Chat;
    if (chatData.type !== 'group') {
      throw new Error('Можно добавлять участников только в групповые чаты');
    }
    
    const currentParticipants = chatData.participants || [];
    const newParticipants = [...new Set([...currentParticipants, ...userIds])];
    
    await updateDoc(chatRef, {
      participants: newParticipants,
      updatedAt: Date.now(),
    });
  },

  // Remove participant from group chat
  async removeParticipantFromGroup(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data() as Chat;
    if (chatData.type !== 'group') {
      throw new Error('Можно удалять участников только из групповых чатов');
    }
    
    const currentParticipants = chatData.participants || [];
    const newParticipants = currentParticipants.filter(id => id !== userId);
    
    if (newParticipants.length < 2) {
      throw new Error('В групповом чате должно быть минимум 2 участника');
    }
    
    // Удаляем из админов, если был админом
    const currentAdmins = chatData.admins || [];
    const newAdmins = currentAdmins.filter(id => id !== userId);
    
    await updateDoc(chatRef, {
      participants: newParticipants,
      admins: newAdmins,
      updatedAt: Date.now(),
    });
  },

  // Add admin to group/channel
  async addAdmin(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data() as Chat;
    if (chatData.type === 'direct') {
      throw new Error('Нельзя добавлять админов в личные чаты');
    }
    
    const currentAdmins = chatData.admins || [];
    if (currentAdmins.includes(userId)) {
      throw new Error('Пользователь уже является администратором');
    }
    
    // Проверяем, что пользователь является участником
    if (!chatData.participants.includes(userId)) {
      throw new Error('Пользователь должен быть участником группы/канала');
    }
    
    await updateDoc(chatRef, {
      admins: [...currentAdmins, userId],
      updatedAt: Date.now(),
    });
  },

  // Remove admin from group/channel
  async removeAdmin(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data() as Chat;
    const currentAdmins = chatData.admins || [];
    
    if (!currentAdmins.includes(userId)) {
      throw new Error('Пользователь не является администратором');
    }
    
    // Нельзя удалить создателя из админов
    if (chatData.createdBy === userId) {
      throw new Error('Нельзя удалить создателя из администраторов');
    }
    
    await updateDoc(chatRef, {
      admins: currentAdmins.filter(id => id !== userId),
      updatedAt: Date.now(),
    });
  },

  // Toggle mute notifications for group/channel
  async toggleMute(chatId: string, userId: string, muted: boolean): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    const currentMuted = (await getDoc(chatRef)).data()?.muted || {};
    
    await updateDoc(chatRef, {
      muted: {
        ...currentMuted,
        [userId]: muted,
      },
      updatedAt: Date.now(),
    });
  },

  // Get media statistics for group/channel
  async getMediaStats(chatId: string): Promise<{
    photos: number;
    videos: number;
    files: number;
    audio: number;
    links: number;
    voiceMessages: number;
    gifs: number;
  }> {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );
    const snapshot = await getDocs(q);
    
    const stats = {
      photos: 0,
      videos: 0,
      files: 0,
      audio: 0,
      links: 0,
      voiceMessages: 0,
      gifs: 0,
    };
    
    snapshot.docs.forEach((doc) => {
      const message = doc.data();
      const text = message.text?.toLowerCase() || '';
      
      if (message.type === 'image') {
        stats.photos++;
      } else if (message.type === 'file') {
        if (text.includes('[голосовое сообщение]') || text.includes('voice')) {
          stats.voiceMessages++;
        } else if (text.includes('.gif') || text.includes('gif')) {
          stats.gifs++;
        } else if (text.includes('http://') || text.includes('https://')) {
          stats.links++;
        } else {
          stats.files++;
        }
      } else if (message.text) {
        // Проверяем ссылки в текстовых сообщениях
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (urlRegex.test(message.text)) {
          stats.links++;
        }
      }
    });
    
    return stats;
  },

  // Get user's groups and channels where they are admin
  async getUserAdminChats(userId: string): Promise<Chat[]> {
    const q = query(
      collection(db, 'chats'),
      where('admins', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[];
  },

  // Get user's created groups and channels
  async getUserCreatedChats(userId: string): Promise<Chat[]> {
    const q = query(
      collection(db, 'chats'),
      where('createdBy', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[];
  },
};

