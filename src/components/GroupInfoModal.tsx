import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { close, volumeMute, volumeHigh, settings, warning, ellipsisHorizontal, exit, personAdd, images, videocam, document, musicalNotes, link, mic, logoIonic } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import { authService, UserProfile } from '../services/authService';
import { chatService, Chat } from '../services/chatService';
import { imageUtils } from '../utils/imageUtils';
import { useHistory } from 'react-router-dom';
import './GroupInfoModal.css';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose, chat }) => {
  const { user } = useAuth();
  const history = useHistory();
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaStats, setMediaStats] = useState({
    photos: 0,
    videos: 0,
    files: 0,
    audio: 0,
    links: 0,
    voiceMessages: 0,
    gifs: 0,
  });
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !user) return;

    setIsLoading(true);
    
    // Загружаем профили всех участников
    const loadParticipants = async () => {
      const profiles: UserProfile[] = [];
      const adminProfiles: UserProfile[] = [];
      
      for (const participantId of chat.participants) {
        try {
          const profile = await authService.getUserProfile(participantId);
          if (profile) {
            profiles.push(profile);
            if (chat.admins?.includes(participantId)) {
              adminProfiles.push(profile);
            }
          }
        } catch (error) {
          console.error('Error loading participant profile:', error);
        }
      }
      
      setParticipants(profiles);
      setAdmins(adminProfiles);
      
      // Загружаем статистику медиа
      try {
        const stats = await chatService.getMediaStats(chat.id);
        setMediaStats(stats);
      } catch (error) {
        console.error('Error loading media stats:', error);
      }
      
      // Проверяем статус уведомлений
      setIsMuted(chat.muted?.[user.uid] || false);
      
      setIsLoading(false);
    };

    loadParticipants();
  }, [isOpen, chat.participants, chat.admins, chat.muted, user]);

  const handleLeaveGroup = async () => {
    if (!user || isLeaving) return;

    if (!window.confirm('Вы уверены, что хотите покинуть группу?')) {
      return;
    }

    setIsLeaving(true);
    try {
      await chatService.removeParticipantFromGroup(chat.id, user.uid);
      onClose();
      history.push('/home');
    } catch (error: any) {
      alert(error.message || 'Ошибка при выходе из группы');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleToggleMute = async () => {
    if (!user) return;
    try {
      await chatService.toggleMute(chat.id, user.uid, !isMuted);
      setIsMuted(!isMuted);
    } catch (error: any) {
      alert(error.message || 'Ошибка при изменении настроек уведомлений');
    }
  };

  const handleAddAdmin = async (userId: string) => {
    if (!user) return;
    try {
      await chatService.addAdmin(chat.id, userId);
      // Обновляем список админов
      const profile = await authService.getUserProfile(userId);
      if (profile) {
        setAdmins([...admins, profile]);
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка при добавлении администратора');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!user) return;
    if (!window.confirm('Удалить пользователя из администраторов?')) {
      return;
    }
    try {
      await chatService.removeAdmin(chat.id, userId);
      setAdmins(admins.filter(a => a.uid !== userId));
    } catch (error: any) {
      alert(error.message || 'Ошибка при удалении администратора');
    }
  };

  const isAdmin = user && chat.admins?.includes(user.uid);
  const isCreator = user && chat.createdBy === user.uid;

  const getGroupAvatar = () => {
    if (chat.avatar) return chat.avatar;
    return imageUtils.generateAvatarUrl(chat.name || 'Группа', '4a9eff');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!isOpen || !user) {
    return null;
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="group-info-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Информация</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="group-info-container">
          {/* Аватар и основная информация */}
          <div className="group-info-header">
            <div className="group-info-avatar">
              <img
                src={getGroupAvatar()}
                alt={chat.name || 'Группа'}
              />
            </div>
            <h2 className="group-info-name">{chat.name || 'Группа'}</h2>
            <p className="group-info-meta">
              {participants.length} участника, {onlineCount} в сети
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="group-info-actions-row">
            <button 
              className="group-info-action-button"
              onClick={handleToggleMute}
              title={isMuted ? 'Включить звук' : 'Отключить звук'}
            >
              <IonIcon icon={isMuted ? volumeMute : volumeHigh} />
              <span>Звук</span>
            </button>
            {(isAdmin || isCreator) && (
              <button 
                className="group-info-action-button"
                onClick={() => {/* TODO: Управление */}}
                title="Управление"
              >
                <IonIcon icon={settings} />
                <span>Управление</span>
              </button>
            )}
            <button 
              className="group-info-action-button"
              onClick={() => {/* TODO: Жалоба */}}
              title="Пожаловаться"
            >
              <IonIcon icon={warning} />
              <span>Жалоба</span>
            </button>
            <button 
              className="group-info-action-button"
              onClick={() => {/* TODO: Ещё */}}
              title="Ещё"
            >
              <IonIcon icon={ellipsisHorizontal} />
              <span>Ещё</span>
            </button>
          </div>

          {/* Описание */}
          {chat.description && (
            <div className="group-info-description-section">
              <p className="group-info-description-text">{chat.description}</p>
            </div>
          )}

          {/* Статистика медиа */}
          <div className="group-info-media-stats">
            <div className="group-info-media-item">
              <IonIcon icon={images} className="media-icon" />
              <span>{mediaStats.photos} фотографии</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={videocam} className="media-icon" />
              <span>{mediaStats.videos} видео</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={document} className="media-icon" />
              <span>{mediaStats.files} файлов</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={musicalNotes} className="media-icon" />
              <span>{mediaStats.audio} аудиофайлов</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={link} className="media-icon" />
              <span>{mediaStats.links} ссылки</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={mic} className="media-icon" />
              <span>{mediaStats.voiceMessages} голосовых сообщения</span>
            </div>
            <div className="group-info-media-item">
              <IonIcon icon={logoIonic} className="media-icon" />
              <span>{mediaStats.gifs} GIF</span>
            </div>
          </div>

          {/* Администраторы */}
          {(isAdmin || isCreator) && (
            <div className="group-info-section">
              <h3 className="group-info-section-title">
                Администраторы ({admins.length})
              </h3>
              <div className="group-info-participants">
                {admins.map((admin) => (
                  <div key={admin.uid} className="group-info-participant">
                    <div className="group-info-participant-avatar">
                      <img
                        src={admin.photoURL || imageUtils.generateAvatarUrl(admin.displayName, '4a9eff')}
                        alt={admin.displayName}
                      />
                    </div>
                    <div className="group-info-participant-info">
                      <div className="group-info-participant-name">
                        {admin.displayName}
                        {admin.uid === chat.createdBy && <span className="group-info-participant-badge">Создатель</span>}
                      </div>
                      <div className="group-info-participant-email">{admin.email}</div>
                    </div>
                    {isCreator && admin.uid !== chat.createdBy && (
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => handleRemoveAdmin(admin.uid)}
                      >
                        Удалить
                      </IonButton>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Участники */}
          <div className="group-info-section">
            <h3 className="group-info-section-title">
              Участники ({participants.length})
            </h3>
            
            {isLoading ? (
              <div className="group-info-loading">Загрузка...</div>
            ) : (
              <div className="group-info-participants">
                {participants.map((participant) => {
                  const isCurrentUser = participant.uid === user.uid;
                  const isParticipantAdmin = chat.admins?.includes(participant.uid);
                  
                  return (
                    <div
                      key={participant.uid}
                      className={`group-info-participant ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="group-info-participant-avatar">
                        <img
                          src={participant.photoURL || imageUtils.generateAvatarUrl(participant.displayName, '4a9eff')}
                          alt={participant.displayName}
                        />
                      </div>
                      <div className="group-info-participant-info">
                        <div className="group-info-participant-name">
                          {participant.displayName}
                          {isCurrentUser && <span className="group-info-participant-badge">Вы</span>}
                          {isParticipantAdmin && <span className="group-info-participant-badge admin">Админ</span>}
                        </div>
                        <div className="group-info-participant-email">{participant.email}</div>
                      </div>
                      {(isAdmin || isCreator) && !isParticipantAdmin && !isCurrentUser && (
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => handleAddAdmin(participant.uid)}
                        >
                          <IonIcon icon={personAdd} slot="start" />
                          Админ
                        </IonButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="group-info-actions">
            <IonButton
              expand="block"
              color="danger"
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="group-info-action-btn"
            >
              <IonIcon icon={exit} slot="start" />
              {isLeaving ? 'Выход...' : 'Покинуть группу'}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default GroupInfoModal;
