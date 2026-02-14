import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService, Chat, Message } from '../services/chatService';
import { authService, UserProfile } from '../services/authService';
import { typingService } from '../services/typingService';
import { presenceService, PresenceData } from '../services/presenceService';
import { callService, Call } from '../services/callService';
import { imageUtils } from '../utils/imageUtils';
import EmojiPicker from './EmojiPicker';
import CallModal from './CallModal';
import UserInfoModal from './UserInfoModal';
import GroupInfoModal from './GroupInfoModal';
import './ChatWindow.css';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceData | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [messageSenders, setMessageSenders] = useState<{ [userId: string]: UserProfile }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    chatService.markMessagesAsRead(chat.id, user.uid);

    const unsubscribe = chatService.subscribeToMessages(chat.id, (updatedMessages) => {
      setMessages(updatedMessages);
      
      // Загружаем профили отправителей для групповых чатов
      if (chat.type === 'group' && user) {
        const loadSenders = async () => {
          const senders: { [userId: string]: UserProfile } = {};
          const uniqueSenderIds = [...new Set(updatedMessages.map(m => m.senderId))];
          
          for (const senderId of uniqueSenderIds) {
            if (senderId !== user.uid && !senders[senderId]) {
              try {
                const profile = await authService.getUserProfile(senderId);
                if (profile) {
                  senders[senderId] = profile;
                }
              } catch (error) {
                console.error('Error loading sender profile:', error);
              }
            }
          }
          
          setMessageSenders(prev => ({ ...prev, ...senders }));
        };
        
        loadSenders();
      }
    });

    if (chat.type === 'direct' && user) {
      const otherUserId = chat.participants.find((id) => id !== user.uid);
      if (otherUserId) {
        authService.getUserProfile(otherUserId).then(setOtherUser);
        
        // Подписываемся на статус онлайн другого пользователя
        const presenceUnsubscribe = presenceService.subscribeToPresence(otherUserId, (presence) => {
          setOtherUserPresence(presence);
        });
        
        return () => {
          unsubscribe();
          presenceUnsubscribe();
        };
      }
    }

    return () => unsubscribe();
  }, [chat.id, chat.type, chat.participants, user]);

  // Подписка на входящие звонки
  useEffect(() => {
    if (!user) return;

    const unsubscribe = callService.subscribeToActiveCall(user.uid, (call) => {
      setActiveCall(call);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Typing indicator - отправка статуса печати
  useEffect(() => {
    if (!user || !newMessage.trim()) {
      typingService.setTyping(chat.id, user?.uid || '', false);
      return;
    }

    typingService.setTyping(chat.id, user.uid, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      typingService.setTyping(chat.id, user.uid, false);
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingService.setTyping(chat.id, user?.uid || '', false);
    };
  }, [newMessage, user, chat.id]);

  // Подписка на статус печати других пользователей
  useEffect(() => {
    if (!user) return;

    const unsubscribe = typingService.subscribeToTyping(chat.id, (users) => {
      const otherTypingUsers = users.filter((uid: string) => uid !== user.uid);
      setTypingUsers(otherTypingUsers);
    });

    return () => unsubscribe();
  }, [chat.id, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await chatService.sendMessage(chat.id, user.uid, newMessage.trim());
    setNewMessage('');
    setIsTyping(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleCall = async (type: 'voice' | 'video') => {
    if (!user || !otherUser) return;
    
    try {
      await callService.initiateCall(user.uid, otherUser.uid, type);
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Ошибка при инициировании звонка');
    }
  };

  const handleCallAnswer = () => {
    if (activeCall) {
      startCall();
    }
  };

  const handleCallReject = () => {
    if (activeCall) {
      callService.rejectCall(activeCall.id);
      setActiveCall(null);
    }
  };

  const handleCallEnd = () => {
    if (activeCall) {
      callService.endCall(activeCall.id);
      setActiveCall(null);
    }
  };

  const startCall = async () => {
    // В реальном приложении здесь была бы WebRTC логика
    // Для демонстрации просто показываем модальное окно
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Для изображений конвертируем в Base64
      if (file.type.startsWith('image/')) {
        const base64 = await imageUtils.processAvatarImage(file);
        if (base64) {
          await chatService.sendMessage(chat.id, user.uid, `[Изображение]`, 'image', base64);
        }
      } else {
        // Для других файлов показываем имя
        await chatService.sendMessage(chat.id, user.uid, `[Файл: ${file.name}]`, 'file');
      }
    } catch (error: any) {
      console.error('Error sending file:', error);
      alert(error.message || 'Ошибка при отправке файла');
    } finally {
      // Сброс input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const getChatName = () => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct' && otherUser) {
      return otherUser.displayName || 'Пользователь';
    }
    return 'Чат';
  };

  const getChatAvatar = () => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'direct' && otherUser) {
      return otherUser.photoURL || imageUtils.generateAvatarUrl(otherUser.displayName || 'User', '4a9eff');
    }
    return imageUtils.generateAvatarUrl(getChatName(), '4a9eff');
  };

  const getStatusText = () => {
    // Для групп и каналов не показываем статусы
    if (chat.type === 'group' || chat.type === 'channel') {
      return '';
    }
    
    // Если пользователь печатает, показываем это
    if (typingUsers.length > 0) {
      return 'печатает...';
    }
    
    // Для прямых чатов проверяем статус онлайн
    if (chat.type === 'direct' && otherUser && otherUserPresence && user) {
      const canSee = presenceService.canSeeOnlineStatus(
        otherUser.uid,
        otherUserPresence.visibility,
        otherUserPresence.visibleTo || [],
        user.uid,
        true // Считаем что если есть чат, то это контакт
      );
      
      if (canSee && otherUserPresence.isOnline) {
        return 'в сети';
      } else if (canSee && otherUserPresence.lastSeen) {
        const lastSeen = new Date(otherUserPresence.lastSeen);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
        
        if (diffMinutes < 1) return 'был(а) в сети только что';
        if (diffMinutes < 60) return `был(а) в сети ${diffMinutes} мин. назад`;
        if (diffMinutes < 1440) return `был(а) в сети ${Math.floor(diffMinutes / 60)} ч. назад`;
        return 'был(а) в сети недавно';
      }
    }
    
    return 'был(а) в сети недавно';
  };

  // Группировка сообщений по датам
  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = new Date(message.timestamp);
    const dateKey = date.toLocaleDateString('ru-RU');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {});

  return (
    <section className="chat-window">
      {/* Хедер чата */}
      <header className="chat-window__header">
        <button className="chat-window__back" onClick={onBack} aria-label="Назад к чатам">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="chat-window__user">
          <div 
            className="chat-window__avatar" 
            onClick={() => {
              if (chat.type === 'direct' && otherUser) {
                setShowUserInfo(true);
              } else if (chat.type === 'group') {
                setShowGroupInfo(true);
              }
            }}
            style={{ cursor: (chat.type === 'direct' && otherUser) || chat.type === 'group' ? 'pointer' : 'default' }}
          >
            <img src={getChatAvatar()} alt={getChatName()} />
            {otherUserPresence?.isOnline && (
              <span className="avatar-online-indicator"></span>
            )}
          </div>
          <div className="chat-window__info">
            <h2 className="chat-window__name">{getChatName()}</h2>
            <p className="chat-window__status">
              {getStatusText()}
            </p>
          </div>
        </div>

        <div className="chat-window__actions">
          {chat.type === 'direct' && (
            <button 
              className="chat-window__action-btn" 
              onClick={() => handleCall('voice')}
              aria-label="Голосовой звонок"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {chat.type === 'direct' && (
            <button 
              className="chat-window__action-btn" 
              onClick={() => handleCall('video')}
              aria-label="Видео звонок"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 7l-7 5 7 5V7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button className="chat-window__action-btn" aria-label="Поиск">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="chat-window__action-btn" aria-label="Меню">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Сообщения */}
      <div className="messages">
        {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
          <React.Fragment key={dateKey}>
            {/* Дата */}
            <div className="messages__date">
              <time dateTime={dateKey}>{formatDate(dateMessages[0].timestamp)}</time>
            </div>

            {/* Сообщения за эту дату */}
            {dateMessages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const senderProfile = chat.type === 'group' && !isOwn ? messageSenders[message.senderId] : null;
              const prevMessage = index > 0 ? dateMessages[index - 1] : null;
              const showSenderInfo = chat.type === 'group' && !isOwn && (
                !prevMessage || prevMessage.senderId !== message.senderId
              );
              
              return (
                <article key={message.id} className={`message ${isOwn ? 'message--outgoing' : 'message--incoming'}`}>
                  {!isOwn && (
                    <div 
                      className="message__avatar"
                      onClick={() => {
                        if (chat.type === 'direct' && otherUser) {
                          setShowUserInfo(true);
                        } else if (chat.type === 'group' && senderProfile) {
                          // Можно добавить открытие информации о пользователе
                        }
                      }}
                      style={{ cursor: chat.type === 'direct' ? 'pointer' : 'default' }}
                    >
                      {chat.type === 'group' && senderProfile ? (
                        <img 
                          src={senderProfile.photoURL || imageUtils.generateAvatarUrl(senderProfile.displayName, '4a9eff')} 
                          alt={senderProfile.displayName} 
                        />
                      ) : (
                        <>
                          <img src={getChatAvatar()} alt={getChatName()} />
                          {otherUserPresence?.isOnline && (
                            <span className="avatar-online-indicator"></span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div className="message__content">
                    {chat.type === 'group' && !isOwn && showSenderInfo && senderProfile && (
                      <div className="message__sender-name">{senderProfile.displayName}</div>
                    )}
                    <div className="message__bubble">
                      {message.type === 'image' && message.fileUrl ? (
                        <div className="message__image-wrapper">
                          <img 
                            src={message.fileUrl} 
                            alt="Изображение" 
                            className="message__image"
                          />
                        </div>
                      ) : message.type === 'file' ? (
                        <div className="message__file">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '20px', height: '20px', marginRight: '8px' }}>
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>{message.text}</span>
                        </div>
                      ) : null}
                      <p className="message__text">{message.text}</p>
                      {isOwn ? (
                        <div className="message__meta">
                          <time className="message__time" dateTime={new Date(message.timestamp).toISOString()}>
                            {formatTime(message.timestamp)}
                          </time>
                          {message.read ? (
                            // Две галочки - прочитано
                            <svg 
                              className="message__read-status message__read-status--read" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor"
                            >
                              <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M22 6L11 17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            // Одна галочка - отправлено, но не прочитано
                            <svg 
                              className="message__read-status" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor"
                            >
                              <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      ) : (
                        <time className="message__time" dateTime={new Date(message.timestamp).toISOString()}>
                          {formatTime(message.timestamp)}
                        </time>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </React.Fragment>
        ))}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <article className="message message--incoming">
            <div className="message__avatar">
              <img src={getChatAvatar()} alt={getChatName()} />
            </div>
            <div className="message__content">
              <div className="message__bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </article>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Панель ввода */}
      <footer className="input-panel">
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*,.gif,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            multiple={false}
          />
          <button 
            className="input-panel__attach-btn" 
            onClick={() => fileInputRef.current?.click()}
            aria-label="Прикрепить файл"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="input-panel__input-wrapper" style={{ position: 'relative' }}>
          <input 
            ref={inputRef}
            type="text" 
            className="input-panel__input" 
            placeholder="Написать сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            aria-label="Поле ввода сообщения"
          />
          <button 
            className="input-panel__emoji-btn" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Добавить эмодзи"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="1" fill="currentColor"/>
              <circle cx="15" cy="9" r="1" fill="currentColor"/>
            </svg>
          </button>
          {showEmojiPicker && (
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>

        <button 
          className="input-panel__send-btn" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          aria-label="Отправить сообщение"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </footer>

      {/* Модальное окно звонка */}
      {activeCall && (
        <CallModal
          call={activeCall}
          onAnswer={handleCallAnswer}
          onReject={handleCallReject}
          onEnd={handleCallEnd}
        />
      )}

      {/* Модальное окно информации о пользователе */}
      {chat.type === 'direct' && otherUser && (
        <UserInfoModal
          isOpen={showUserInfo}
          onClose={() => setShowUserInfo(false)}
          userId={otherUser.uid}
        />
      )}

      {/* Модальное окно информации о группе */}
      {chat.type === 'group' && (
        <GroupInfoModal
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          chat={chat}
        />
      )}
    </section>
  );
};

export default ChatWindow;
