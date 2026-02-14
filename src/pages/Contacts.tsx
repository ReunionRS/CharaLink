import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { contactsService, Contact } from '../services/contactsService';
import { authService, UserProfile } from '../services/authService';
import { chatService } from '../services/chatService';
import { userSearchService } from '../services/userSearchService';
import { imageUtils } from '../utils/imageUtils';
import { arrowBack, add, people } from 'ionicons/icons';
import './Contacts.css';

const Contacts: React.FC = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactProfiles, setContactProfiles] = useState<{ [key: string]: UserProfile }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    if (!user) {
      history.push('/login');
      return;
    }

    const unsubscribe = contactsService.subscribeToContacts(user.uid, (updatedContacts) => {
      setContacts(updatedContacts);
    });

    return () => unsubscribe();
  }, [user, history]);

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

  // Поиск пользователей для добавления в контакты
  useEffect(() => {
    if (searchQuery.length >= 2 && user) {
      setIsSearching(true);
      userSearchService.searchUsers(searchQuery, user.uid).then((results) => {
        // Фильтруем результаты, исключая уже добавленных в контакты
        const contactUserIds = new Set(contacts.map(c => c.contactUserId));
        const filteredResults = results.filter(r => !contactUserIds.has(r.uid));
        setSearchResults(filteredResults);
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user, contacts]);

  const handleAddContact = async (contactUserId: string) => {
    if (!user) return;
    
    try {
      await contactsService.addContact(user.uid, contactUserId);
      setSearchQuery('');
      setSearchResults([]);
      setShowAddContact(false);
    } catch (error: any) {
      alert(error.message || 'Ошибка при добавлении контакта');
    }
  };

  const handleRemoveContact = async (contactUserId: string) => {
    if (!user) return;
    
    if (window.confirm('Удалить пользователя из контактов?')) {
      try {
        await contactsService.removeContact(user.uid, contactUserId);
      } catch (error: any) {
        alert(error.message || 'Ошибка при удалении контакта');
      }
    }
  };

  const handleStartChat = async (contactUserId: string) => {
    if (!user) return;
    
    try {
      const chatId = await chatService.getOrCreateDirectChat(user.uid, contactUserId);
      history.push(`/home?chatId=${chatId}`);
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании чата');
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const profile = contactProfiles[contact.contactUserId];
    if (!profile) return false;
    const query = searchQuery.toLowerCase();
    return (
      profile.displayName?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query)
    );
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.push('/home')}>
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>Контакты</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => setShowAddContact(!showAddContact)}>
            <IonIcon icon={add} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="contacts-container">
          {/* Поиск */}
          <div className="contacts-search">
            <input
              type="text"
              className="contacts-search-input"
              placeholder={showAddContact ? "Поиск пользователей для добавления..." : "Поиск контактов..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Результаты поиска для добавления контактов */}
          {showAddContact && searchResults.length > 0 && (
            <div className="contacts-section">
              <h3 className="contacts-section-title">Найденные пользователи</h3>
              {searchResults.map((userResult) => (
                <div key={userResult.uid} className="contact-item">
                  <div className="contact-avatar">
                    <img
                      src={userResult.photoURL || imageUtils.generateAvatarUrl(userResult.displayName, '4a9eff')}
                      alt={userResult.displayName}
                    />
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{userResult.displayName}</div>
                    <div className="contact-email">{userResult.email}</div>
                  </div>
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => handleAddContact(userResult.uid)}
                  >
                    Добавить
                  </IonButton>
                </div>
              ))}
            </div>
          )}

          {showAddContact && isSearching && (
            <div className="contacts-loading">Поиск...</div>
          )}

          {showAddContact && !isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="contacts-empty">Пользователи не найдены</div>
          )}

          {/* Список контактов */}
          {!showAddContact && (
            <div className="contacts-section">
              <h3 className="contacts-section-title">Мои контакты ({filteredContacts.length})</h3>
              {filteredContacts.length === 0 ? (
                <div className="contacts-empty">
                  {searchQuery ? 'Контакты не найдены' : 'У вас пока нет контактов. Добавьте пользователей для начала общения.'}
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const profile = contactProfiles[contact.contactUserId];
                  if (!profile) return null;

                  return (
                    <div key={contact.id} className="contact-item">
                      <div className="contact-avatar">
                        <img
                          src={profile.photoURL || imageUtils.generateAvatarUrl(profile.displayName, '4a9eff')}
                          alt={profile.displayName}
                        />
                      </div>
                      <div 
                        className="contact-info"
                        onClick={() => handleStartChat(contact.contactUserId)}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <div className="contact-name">{profile.displayName}</div>
                        <div className="contact-email">{profile.email}</div>
                      </div>
                      <div className="contact-actions">
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() => handleStartChat(contact.contactUserId)}
                        >
                          Чат
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => handleRemoveContact(contact.contactUserId)}
                        >
                          Удалить
                        </IonButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Кнопка создания группового чата */}
          {!showAddContact && (
            <div className="contacts-section">
              <IonButton
                expand="block"
                onClick={() => history.push('/home?createGroup=true')}
                className="create-group-button"
              >
                <IonIcon icon={people} slot="start" />
                Создать групповой чат
              </IonButton>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Contacts;

