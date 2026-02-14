import React, { useState, useEffect } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonItem, IonLabel, IonCheckbox, IonInput, IonTextarea } from '@ionic/react';
import { close, checkmark } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import { contactsService, Contact } from '../services/contactsService';
import { authService, UserProfile } from '../services/authService';
import { chatService } from '../services/chatService';
import { imageUtils } from '../utils/imageUtils';
import './CreateGroupModal.css';

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated: (chatId: string) => void;
  preSelectedUsers?: string[]; // Предвыбранные пользователи
  isOpen?: boolean; // Контроль открытия модального окна
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onGroupCreated, preSelectedUsers = [], isOpen = true }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactProfiles, setContactProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set(preSelectedUsers));
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [preSelectedProfiles, setPreSelectedProfiles] = useState<{ [key: string]: UserProfile }>({});

  useEffect(() => {
    if (!user) return;

    const unsubscribe = contactsService.subscribeToContacts(user.uid, (updatedContacts) => {
      setContacts(updatedContacts);
    });

    return () => unsubscribe();
  }, [user]);

  // Загружаем профили предвыбранных пользователей
  useEffect(() => {
    if (!user || preSelectedUsers.length === 0) return;

    const loadPreSelectedProfiles = async () => {
      const profiles: { [key: string]: UserProfile } = {};
      
      for (const userId of preSelectedUsers) {
        try {
          const profile = await authService.getUserProfile(userId);
          if (profile) {
            profiles[userId] = profile;
          }
        } catch (error) {
          console.error('Error loading pre-selected user profile:', error);
        }
      }
      
      setPreSelectedProfiles(profiles);
    };

    loadPreSelectedProfiles();
  }, [preSelectedUsers, user]);

  // Загружаем профили контактов
  useEffect(() => {
    if (!user || contacts.length === 0) return;

    const loadContactProfiles = async () => {
      const profiles: { [key: string]: UserProfile } = {};
      
      for (const contact of contacts) {
        try {
          const profile = await authService.getUserProfile(contact.contactUserId);
          if (profile) {
            profiles[contact.contactUserId] = profile;
          }
        } catch (error) {
          console.error('Error loading contact profile:', error);
        }
      }
      
      setContactProfiles(profiles);
    };

    loadContactProfiles();
  }, [contacts, user]);

  const handleToggleContact = (contactUserId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactUserId)) {
      newSelected.delete(contactUserId);
    } else {
      newSelected.add(contactUserId);
    }
    setSelectedContacts(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    
    if (!groupName.trim()) {
      alert('Введите название группы');
      return;
    }

    if (selectedContacts.size < 1) {
      alert('Выберите хотя бы одного участника');
      return;
    }

    setIsCreating(true);
    try {
      const participantIds = Array.from(selectedContacts);
      const chatId = await chatService.createGroupChat(
        user.uid,
        participantIds,
        groupName.trim(),
        undefined,
        groupDescription.trim() || undefined
      );
      
      onGroupCreated(chatId);
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании группы');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Создать групповой чат</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="create-group-container">
          <div className="create-group-form">
            <IonItem>
              <IonLabel position="stacked">Название группы *</IonLabel>
              <IonInput
                value={groupName}
                placeholder="Введите название группы"
                onIonInput={(e) => setGroupName(e.detail.value!)}
                maxlength={50}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Описание (необязательно)</IonLabel>
              <IonTextarea
                value={groupDescription}
                placeholder="Введите описание группы"
                onIonInput={(e) => setGroupDescription(e.detail.value!)}
                rows={3}
                maxlength={200}
              />
            </IonItem>
          </div>

          <div className="create-group-contacts">
            <h3 className="create-group-section-title">
              Выберите участников ({selectedContacts.size})
            </h3>
            
            {/* Предвыбранные пользователи (не из контактов) */}
            {preSelectedUsers.length > 0 && (
              <div className="create-group-contacts-list">
                {preSelectedUsers.map((userId) => {
                  const profile = preSelectedProfiles[userId];
                  if (!profile) return null;

                  const isSelected = selectedContacts.has(userId);
                  const isInContacts = contacts.some(c => c.contactUserId === userId);

                  return (
                    <div
                      key={`pre-${userId}`}
                      className={`create-group-contact-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleContact(userId)}
                    >
                      <div className="create-group-contact-avatar">
                        <img
                          src={profile.photoURL || imageUtils.generateAvatarUrl(profile.displayName, '4a9eff')}
                          alt={profile.displayName}
                        />
                      </div>
                      <div className="create-group-contact-info">
                        <div className="create-group-contact-name">
                          {profile.displayName}
                          {!isInContacts && <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginLeft: '8px' }}>(не в контактах)</span>}
                        </div>
                        <div className="create-group-contact-email">{profile.email}</div>
                      </div>
                      <IonCheckbox
                        checked={isSelected}
                        onIonChange={() => handleToggleContact(userId)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Контакты */}
            {contacts.length === 0 && preSelectedUsers.length === 0 ? (
              <div className="create-group-empty">
                У вас нет контактов. Добавьте пользователей в контакты, чтобы создать группу.
              </div>
            ) : (
              <div className="create-group-contacts-list">
                {contacts.map((contact) => {
                  const profile = contactProfiles[contact.contactUserId];
                  if (!profile) return null;

                  const isSelected = selectedContacts.has(contact.contactUserId);

                  return (
                    <div
                      key={contact.id}
                      className={`create-group-contact-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleContact(contact.contactUserId)}
                    >
                      <div className="create-group-contact-avatar">
                        <img
                          src={profile.photoURL || imageUtils.generateAvatarUrl(profile.displayName, '4a9eff')}
                          alt={profile.displayName}
                        />
                      </div>
                      <div className="create-group-contact-info">
                        <div className="create-group-contact-name">{profile.displayName}</div>
                        <div className="create-group-contact-email">{profile.email}</div>
                      </div>
                      <IonCheckbox
                        checked={isSelected}
                        onIonChange={() => handleToggleContact(contact.contactUserId)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="create-group-actions">
            <IonButton
              expand="block"
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim() || selectedContacts.size < 1}
            >
              {isCreating ? 'Создание...' : 'Создать группу'}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default CreateGroupModal;

