import React, { useState, useEffect, useRef } from 'react';
import { IonPage } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { chatService, Chat } from '../services/chatService';
import { authService, UserProfile } from '../services/authService';
import { presenceService } from '../services/presenceService';
import { userSearchService } from '../services/userSearchService';
import { contactsService } from '../services/contactsService';
import { imageUtils } from '../utils/imageUtils';
import ChatWindow from '../components/ChatWindow';
import Profile from '../components/Profile';
import ChatOnlineIndicator from '../components/ChatOnlineIndicator';
import CreateGroupModal from '../components/CreateGroupModal';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { user, userProfile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [preSelectedUsers, setPreSelectedUsers] = useState<string[]>([]);
  const profileToggleRef = useRef<HTMLInputElement>(null);
  const themeToggleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Ждем завершения загрузки перед проверкой авторизации
    if (loading) return;
    
    if (!user) {
      history.push('/login');
      return;
    }

    const unsubscribe = chatService.subscribeToUserChats(user.uid, (updatedChats) => {
      setChats(updatedChats);
    });

    // Инициализируем presence tracking
    const cleanupPresence = presenceService.initializePresence(user.uid);

    return () => {
      unsubscribe();
      cleanupPresence();
    };
  }, [user, history, loading]);

  // Отдельный эффект для обработки URL параметров (отслеживает изменения location)
  useEffect(() => {
    if (!user || loading) return;

    const urlParams = new URLSearchParams(location.search);
    const chatId = urlParams.get('chatId');
    const createGroup = urlParams.get('createGroup');
    const addUser = urlParams.get('addUser');
    
    if (chatId) {
      // Ждем загрузки чатов перед открытием
      if (chats.length > 0) {
        const foundChat = chats.find(c => c.id === chatId);
        if (foundChat) {
          setSelectedChat(foundChat);
        }
        // Очищаем URL параметры
        setTimeout(() => {
          window.history.replaceState({}, '', '/home');
        }, 100);
      }
    }
    
    if (createGroup === 'true') {
      // Устанавливаем состояние сразу
      setShowCreateGroup(true);
      // Проверяем, есть ли предвыбранный пользователь
      if (addUser) {
        setPreSelectedUsers([addUser]);
      } else {
        setPreSelectedUsers([]);
      }
      // Очищаем URL параметры после небольшой задержки, чтобы состояние успело установиться
      setTimeout(() => {
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('createGroup') === 'true') {
          window.history.replaceState({}, '', '/home');
        }
      }, 300);
    } else if (createGroup === null && showCreateGroup) {
      // Если параметр createGroup был удален из URL, но модальное окно все еще открыто,
      // не закрываем его автоматически - пользователь может закрыть его вручную
    }
  }, [location.search, user, loading, chats]);

  useEffect(() => {
    if (themeToggleRef.current) {
      themeToggleRef.current.checked = theme === 'dark';
    }
  }, [theme]);


  // Search users when query starts with @
  useEffect(() => {
    if (searchQuery.startsWith('@') && user) {
      const searchTerm = searchQuery.slice(1);
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        userSearchService.searchUsers(searchTerm, user.uid).then((results) => {
          setSearchResults(results);
          setIsSearching(false);
        });
      } else {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user]);

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery || searchQuery.startsWith('@')) return true;
    const query = searchQuery.toLowerCase();
    return (
      chat.name?.toLowerCase().includes(query) ||
      chat.lastMessage?.text.toLowerCase().includes(query)
    );
  });

  const handleStartChat = async (otherUser: UserProfile) => {
    if (!user) return;
    
    try {
      const chatId = await chatService.getOrCreateDirectChat(user.uid, otherUser.uid);
      
      // Проверяем, есть ли чат уже в списке
      let foundChat = chats.find(c => c.id === chatId);
      
      if (foundChat) {
        // Чат уже есть, просто выбираем его
        setSelectedChat(foundChat);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        // Чат новый, получаем его из базы
        const allChats = await chatService.getUserChats(user.uid);
        foundChat = allChats.find(c => c.id === chatId);
        
        if (foundChat) {
          setSelectedChat(foundChat);
          setSearchQuery('');
          setSearchResults([]);
        } else {
          // Если чат все еще не найден, создаем временный объект
          const tempChat: Chat = {
            id: chatId,
            type: 'direct',
            participants: [user.uid, otherUser.uid],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setSelectedChat(tempChat);
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    } catch (error: any) {
      console.error('Error starting chat:', error);
      alert(error.message || 'Ошибка при создании чата. Убедитесь, что правила Firestore настроены правильно.');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  const [chatUsers, setChatUsers] = useState<{ [chatId: string]: UserProfile }>({});

  // Загружаем профили пользователей для чатов
  useEffect(() => {
    if (!user || chats.length === 0) return;

    const loadChatUsers = async () => {
      const usersMap: { [chatId: string]: UserProfile } = {};
      
      for (const chat of chats) {
        if (chat.type === 'direct' && user) {
          const otherUserId = chat.participants.find((id) => id !== user.uid);
          if (otherUserId && !usersMap[chat.id]) {
            try {
              const userProfile = await authService.getUserProfile(otherUserId);
              if (userProfile) {
                usersMap[chat.id] = userProfile;
              }
            } catch (error) {
              console.error('Error loading user profile:', error);
            }
          }
        }
      }
      
      setChatUsers(usersMap);
    };

    loadChatUsers();
  }, [chats, user]);

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct' && user) {
      const chatUser = chatUsers[chat.id];
      return chatUser?.displayName || 'Пользователь';
    }
    return 'Чат';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'direct' && user) {
      const chatUser = chatUsers[chat.id];
      if (chatUser?.photoURL) {
        return chatUser.photoURL;
      }
      if (chatUser?.displayName) {
        return imageUtils.generateAvatarUrl(chatUser.displayName, '4a9eff');
      }
    }
    return imageUtils.generateAvatarUrl(getChatName(chat), '4a9eff');
  };

  const getUnreadCount = (chat: Chat) => {
    if (!user) return 0;
    return chat.unreadCount?.[user.uid] || 0;
  };

  const handleThemeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleTheme();
  };

  return (
    <IonPage>
      {/* Чекбоксы для управления UI */}
      <input 
        type="checkbox" 
        id="profile-toggle" 
        className="profile-toggle-checkbox" 
        ref={profileToggleRef}
        checked={showProfile}
        onChange={(e) => setShowProfile(e.target.checked)}
        aria-label="Переключить профиль"
      />
      <input 
        type="checkbox" 
        id="theme-toggle" 
        className="theme-toggle-checkbox" 
        ref={themeToggleRef}
        checked={theme === 'dark'}
        onChange={handleThemeToggle}
        aria-label="Переключить тему"
      />

      {/* Профиль */}
      <Profile onClose={() => setShowProfile(false)} showProfile={showProfile} />

      {/* Главный экран мессенджера */}
      <main className="messenger">
        {/* Sidebar с чатами */}
        <aside className="sidebar">
          {/* Хедер сайдбара */}
          <header className="sidebar__header">
            <label 
              htmlFor="profile-toggle" 
              className="sidebar__profile-btn" 
              aria-label="Открыть профиль"
            >
              <div className="sidebar__profile-avatar">
                <img 
                  src={userProfile?.photoURL || imageUtils.generateAvatarUrl(userProfile?.displayName || 'User', '845ef7')} 
                  alt="Ваш профиль" 
                />
              </div>
            </label>
            
            <div className="sidebar__search">
              <svg className="sidebar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input 
                type="search" 
                className="sidebar__search-input" 
                placeholder="Поиск или @username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              type="button"
              className="sidebar__contacts-btn" 
              onClick={() => history.push('/contacts')}
              aria-label="Контакты"
              title="Контакты"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
            <button 
              type="button"
              className="sidebar__theme-toggle" 
              onClick={handleThemeToggle}
              aria-label="Переключить тему"
            >
              <svg className="theme-icon theme-icon--light" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="5" strokeWidth="2"/>
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <svg className="theme-icon theme-icon--dark" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            </button>
          </header>

          {/* Список чатов или результаты поиска */}
          <nav className="chats" aria-label="Список чатов">
            {/* Результаты поиска пользователей */}
            {searchQuery.startsWith('@') && searchResults.length > 0 && (
              <div style={{ padding: '8px' }}>
                {searchResults.map((userResult) => (
                  <article
                    key={userResult.uid}
                    className="chat"
                    onClick={() => handleStartChat(userResult)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="chat__avatar">
                      <img
                        src={userResult.photoURL || imageUtils.generateAvatarUrl(userResult.displayName, '4a9eff')}
                        alt={userResult.displayName}
                      />
                    </div>
                    <div className="chat__content">
                      <div className="chat__header">
                        <h3 className="chat__name">{userResult.displayName}</h3>
                      </div>
                      <div className="chat__footer">
                        <p className="chat__message">@{userResult.email.split('@')[0]}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            
            {searchQuery.startsWith('@') && isSearching && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Поиск...
              </div>
            )}
            
            {searchQuery.startsWith('@') && !isSearching && searchResults.length === 0 && searchQuery.length > 1 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Пользователи не найдены
              </div>
            )}

            {/* Список чатов */}
            {!searchQuery.startsWith('@') && filteredChats.map((chat) => {
              const unreadCount = getUnreadCount(chat);
              const isActive = selectedChat?.id === chat.id;
              
              return (
                <article 
                  key={chat.id}
                  className={`chat ${isActive ? 'chat--active' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="chat__avatar">
                    <img
                      src={getChatAvatar(chat)}
                      alt={getChatName(chat)}
                    />
                    {chat.type === 'direct' && chatUsers[chat.id] && (
                      <ChatOnlineIndicator chatId={chat.id} otherUserId={chat.participants.find((id) => id !== user?.uid)} />
                    )}
                  </div>
                  <div className="chat__content">
                    <div className="chat__header">
                      <h3 className="chat__name">{getChatName(chat)}</h3>
                      {chat.lastMessage && (
                        <time className="chat__time" dateTime={new Date(chat.lastMessage.timestamp).toISOString()}>
                          {formatTime(chat.lastMessage.timestamp)}
                        </time>
                      )}
                    </div>
                    <div className="chat__footer">
                      {chat.lastMessage && (
                        <>
                          {chat.lastMessage.senderId === user?.uid && (
                            <svg className="chat__read-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <p className="chat__message">{chat.lastMessage.text}</p>
                        </>
                      )}
                      {unreadCount > 0 && (
                        <span className="chat__badge">{unreadCount}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {!searchQuery.startsWith('@') && filteredChats.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Нет чатов. Начните поиск с @ для поиска пользователей
              </div>
            )}
          </nav>
        </aside>

        {/* Окно переписки */}
        <section className="chat-window">
          {selectedChat ? (
            <ChatWindow chat={selectedChat} onBack={() => setSelectedChat(null)} />
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'var(--color-text-secondary)'
            }}>
              <p>Выберите чат для начала общения</p>
            </div>
          )}
        </section>
      </main>

      {/* Модальное окно создания группы */}
      <CreateGroupModal
        onClose={() => {
          setShowCreateGroup(false);
          setPreSelectedUsers([]);
        }}
        preSelectedUsers={preSelectedUsers}
        isOpen={showCreateGroup}
        onGroupCreated={async (chatId) => {
          setShowCreateGroup(false);
          setPreSelectedUsers([]);
          // Ждем немного, чтобы чат успел появиться в списке
          setTimeout(() => {
            const newChat = chats.find(c => c.id === chatId);
            if (newChat) {
              setSelectedChat(newChat);
            } else {
              // Если чат еще не в списке, загружаем его напрямую
              chatService.getUserChats(user?.uid || '').then((allChats) => {
                const foundChat = allChats.find(c => c.id === chatId);
                if (foundChat) {
                  setSelectedChat(foundChat);
                }
              });
            }
          }, 500);
        }}
      />
    </IonPage>
  );
};

export default Home;
