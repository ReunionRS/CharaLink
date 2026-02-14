import { collection, addDoc, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { imageUtils } from '../utils/imageUtils';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  subscribers: string[];
  chatId?: string;
  createdAt: number;
  updatedAt: number;
}

export const channelService = {
  // Create a new channel
  async createChannel(
    name: string,
    createdBy: string,
    description?: string,
    avatarFile?: File
  ): Promise<string> {
    let avatarUrl: string | undefined;

    // Process avatar if provided (convert to Base64)
    if (avatarFile) {
      try {
        const base64 = await imageUtils.processAvatarImage(avatarFile);
        if (base64) {
          avatarUrl = base64; // Store Base64 directly in Firestore
        }
      } catch (error) {
        console.error('Error processing avatar:', error);
        // Fallback to generated avatar
        avatarUrl = imageUtils.generateAvatarUrl(name, '2AABEE');
      }
    } else {
      // Generate avatar URL if no file provided
      avatarUrl = imageUtils.generateAvatarUrl(name, '2AABEE');
    }

    const channelData: any = {
      name,
      avatar: avatarUrl,
      createdBy,
      subscribers: [createdBy],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Добавляем description только если он определен
    if (description) {
      channelData.description = description;
    }

    const docRef = await addDoc(collection(db, 'channels'), channelData);
    
    // Also create a chat for the channel
    const { chatService } = await import('./chatService');
    const chatId = await chatService.createChat('channel', [createdBy], name, createdBy);
    
    // Link channel to chat
    await updateDoc(docRef, { chatId });
    
    return docRef.id;
  },

  // Subscribe to channel
  async subscribeToChannel(channelId: string, userId: string) {
    const channelRef = doc(db, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (channelDoc.exists()) {
      const channel = channelDoc.data() as Channel;
      if (!channel.subscribers.includes(userId)) {
        await updateDoc(channelRef, {
          subscribers: [...channel.subscribers, userId],
          updatedAt: Date.now(),
        });
      }
    }
  },

  // Unsubscribe from channel
  async unsubscribeFromChannel(channelId: string, userId: string) {
    const channelRef = doc(db, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (channelDoc.exists()) {
      const channel = channelDoc.data() as Channel;
      await updateDoc(channelRef, {
        subscribers: channel.subscribers.filter((id) => id !== userId),
        updatedAt: Date.now(),
      });
    }
  },

  // Get user channels
  async getUserChannels(userId: string): Promise<Channel[]> {
    const q = query(
      collection(db, 'channels'),
      where('subscribers', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Channel[];
  },
};

