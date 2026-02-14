import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from './authService';

export interface Contact {
  id: string;
  userId: string; // ID пользователя, который добавил контакт
  contactUserId: string; // ID контакта
  addedAt: number;
  contactProfile?: UserProfile; // Кэшированный профиль контакта
}

export const contactsService = {
  // Добавить пользователя в контакты
  async addContact(userId: string, contactUserId: string): Promise<void> {
    if (userId === contactUserId) {
      throw new Error('Нельзя добавить себя в контакты');
    }

    // Проверяем, не добавлен ли уже этот контакт
    const contactId = `${userId}_${contactUserId}`;
    const contactRef = doc(db, 'contacts', contactId);
    const contactDoc = await getDoc(contactRef);

    if (contactDoc.exists()) {
      throw new Error('Пользователь уже добавлен в контакты');
    }

    await setDoc(contactRef, {
      userId,
      contactUserId,
      addedAt: Date.now(),
    });
  },

  // Удалить пользователя из контактов
  async removeContact(userId: string, contactUserId: string): Promise<void> {
    const contactId = `${userId}_${contactUserId}`;
    const contactRef = doc(db, 'contacts', contactId);
    await deleteDoc(contactRef);
  },

  // Получить все контакты пользователя
  async getContacts(userId: string): Promise<Contact[]> {
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];
  },

  // Подписаться на изменения контактов
  subscribeToContacts(
    userId: string,
    callback: (contacts: Contact[]) => void
  ) {
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contact[];
      callback(contacts);
    });
  },

  // Проверить, является ли пользователь контактом
  async isContact(userId: string, contactUserId: string): Promise<boolean> {
    const contactId = `${userId}_${contactUserId}`;
    const contactRef = doc(db, 'contacts', contactId);
    const contactDoc = await getDoc(contactRef);
    return contactDoc.exists();
  },
};

