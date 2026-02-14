import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonItem,
  IonLabel,
  IonAvatar,
  IonText,
  IonModal,
  IonInput,
  IonTextarea,
  IonIcon,
} from '@ionic/react';
import { addOutline, peopleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { channelService, Channel } from '../services/channelService';
import { chatService } from '../services/chatService';
import { imageUtils } from '../utils/imageUtils';
import './Channels.css';

const Channels: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');

  useEffect(() => {
    if (!user) {
      history.push('/login');
      return;
    }

    loadChannels();
  }, [user, history]);

  const loadChannels = async () => {
    if (!user) return;
    const userChannels = await channelService.getUserChannels(user.uid);
    setChannels(userChannels);
  };

  const handleCreateChannel = async () => {
    if (!user || !newChannelName.trim()) return;

    try {
      await channelService.createChannel(
        newChannelName.trim(),
        user.uid,
        newChannelDescription.trim() || undefined
      );
      setShowCreateModal(false);
      setNewChannelName('');
      setNewChannelDescription('');
      await loadChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleChannelClick = async (channel: Channel) => {
    if (!user) return;
    
    // Find or create chat for this channel
    const chats = await chatService.getUserChats(user.uid);
    const channelChat = chats.find(
      (chat) => chat.type === 'channel' && chat.name === channel.name
    );

    if (channelChat) {
      history.push(`/home?chat=${channelChat.id}`);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Мои каналы</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCreateModal(true)}>
              <IonIcon icon={addOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {channels.length === 0 ? (
          <div className="empty-channels">
            <IonIcon icon={peopleOutline} size="large" />
            <IonText>
              <h2>У вас пока нет каналов</h2>
              <p>Создайте канал, чтобы делиться своими мыслями</p>
            </IonText>
            <IonButton onClick={() => setShowCreateModal(true)}>
              Создать канал
            </IonButton>
          </div>
        ) : (
          <div className="channels-list">
            {channels.map((channel) => (
              <IonItem
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className="channel-item"
              >
                <IonAvatar slot="start" className="channel-avatar">
                  <img
                    src={channel.avatar || imageUtils.generateAvatarUrl(channel.name, '2AABEE')}
                    alt={channel.name}
                  />
                </IonAvatar>
                <IonLabel>
                  <h2>{channel.name}</h2>
                  <p>{channel.description || 'Нет описания'}</p>
                  <p className="channel-subscribers">
                    {channel.subscribers.length} подписчиков
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </div>
        )}

        <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Создать канал</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCreateModal(false)}>Отмена</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="create-channel-form">
              <IonItem>
                <IonLabel position="stacked">Название канала *</IonLabel>
                <IonInput
                  value={newChannelName}
                  onIonInput={(e) => setNewChannelName(e.detail.value!)}
                  placeholder="Введите название канала"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Описание</IonLabel>
                <IonTextarea
                  value={newChannelDescription}
                  onIonInput={(e) => setNewChannelDescription(e.detail.value!)}
                  placeholder="Описание канала..."
                  rows={3}
                />
              </IonItem>

              <IonButton
                expand="block"
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="create-channel-btn"
              >
                Создать канал
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Channels;

