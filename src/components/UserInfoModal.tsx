import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { close, personAdd, people, call, videocam } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import { contactsService } from '../services/contactsService';
import { authService, UserProfile } from '../services/authService';
import { presenceService, PresenceData } from '../services/presenceService';
import { chatService } from '../services/chatService';
import { imageUtils } from '../utils/imageUtils';
import { useHistory } from 'react-router-dom';
import './UserInfoModal.css';

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAddToGroup?: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ isOpen, onClose, userId, onAddToGroup }) => {
  const { user } = useAuth();
  const history = useHistory();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [isContact, setIsContact] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user || !userId) return;

    setIsLoading(true);
    
    // Загружаем профиль пользователя
    authService.getUserProfile(userId).then((profile) => {
      setUserProfile(profile);
      setIsLoading(false);
    });

    // Проверяем, является ли пользователь контактом
    contactsService.isContact(user.uid, userId).then(setIsContact);

    // Подписываемся на статус онлайн
    const unsubscribe = presenceService.subscribeToPresence(userId, (presenceData) => {
      setPresence(presenceData);
    });

    return () => {
      unsubscribe();
      setUserProfile(null);
      setPresence(null);
      setIsContact(false);
    };
  }, [isOpen, userId, user]);

  const handleAddToContacts = async () => {
    if (!user || isAddingContact) return;

    setIsAddingContact(true);
    try {
      await contactsService.addContact(user.uid, userId);
      setIsContact(true);
    } catch (error: any) {
      alert(error.message || 'Ошибка при добавлении в контакты');
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleRemoveFromContacts = async () => {
    if (!user) return;

    if (window.confirm('Удалить пользователя из контактов?')) {
      try {
        await contactsService.removeContact(user.uid, userId);
        setIsContact(false);
      } catch (error: any) {
        alert(error.message || 'Ошибка при удалении из контактов');
      }
    }
  };

  const handleStartChat = async () => {
    if (!user) return;

    try {
      const chatId = await chatService.getOrCreateDirectChat(user.uid, userId);
      onClose();
      history.push(`/home?chatId=${chatId}`);
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании чата');
    }
  };

  const handleAddToGroup = () => {
    if (onAddToGroup) {
      onAddToGroup();
    } else {
      // Переходим на страницу создания группы с предвыбранным пользователем
      history.push(`/home?createGroup=true&addUser=${userId}`);
      onClose();
    }
  };

  const handleCall = async (type: 'voice' | 'video') => {
    if (!user || !userProfile) return;
    
    try {
      // Импортируем callService динамически, если нужно
      const { callService } = await import('../services/callService');
      await callService.initiateCall(user.uid, userId, type);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Ошибка при инициировании звонка');
    }
  };

  const getStatusText = () => {
    if (!user || !presence) return '';

    const canSee = presenceService.canSeeOnlineStatus(
      userId,
      presence.visibility,
      presence.visibleTo || [],
      user.uid,
      isContact
    );

    if (canSee && presence.isOnline) {
      return 'в сети';
    } else if (canSee && presence.lastSeen) {
      const lastSeen = new Date(presence.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
      
      if (diffMinutes < 1) return 'был(а) в сети только что';
      if (diffMinutes < 60) return `был(а) в сети ${diffMinutes} мин. назад`;
      if (diffMinutes < 1440) return `был(а) в сети ${Math.floor(diffMinutes / 60)} ч. назад`;
      return 'был(а) в сети недавно';
    }

    return 'был(а) в сети недавно';
  };

  if (!isOpen || isLoading || !userProfile) {
    return null;
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Информация</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="user-info-container">
          {/* Аватар и основная информация */}
          <div className="user-info-header">
            <div className="user-info-avatar">
              <img
                src={userProfile.photoURL || imageUtils.generateAvatarUrl(userProfile.displayName, '4a9eff')}
                alt={userProfile.displayName}
              />
              {presence?.isOnline && (
                <span className="user-info-online-indicator"></span>
              )}
            </div>
            <h2 className="user-info-name">{userProfile.displayName}</h2>
            <p className="user-info-status">{getStatusText()}</p>
            <p className="user-info-email">{userProfile.email}</p>
          </div>

          {/* Действия */}
          <div className="user-info-actions">
            {!isContact ? (
              <IonButton
                expand="block"
                onClick={handleAddToContacts}
                disabled={isAddingContact}
                className="user-info-action-btn"
              >
                <IonIcon icon={personAdd} slot="start" />
                {isAddingContact ? 'Добавление...' : 'Добавить в контакты'}
              </IonButton>
            ) : (
              <IonButton
                expand="block"
                color="danger"
                onClick={handleRemoveFromContacts}
                className="user-info-action-btn"
              >
                Удалить из контактов
              </IonButton>
            )}

            <IonButton
              expand="block"
              fill="outline"
              onClick={handleStartChat}
              className="user-info-action-btn"
            >
              Написать сообщение
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              onClick={handleAddToGroup}
              className="user-info-action-btn"
            >
              <IonIcon icon={people} slot="start" />
              Добавить в групповой чат
            </IonButton>

            <div className="user-info-call-buttons">
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => handleCall('voice')}
                className="user-info-call-btn"
              >
                <IonIcon icon={call} slot="start" />
                Звонок
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => handleCall('video')}
                className="user-info-call-btn"
              >
                <IonIcon icon={videocam} slot="start" />
                Видеозвонок
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default UserInfoModal;

