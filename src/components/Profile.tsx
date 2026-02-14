import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService, OnlineVisibility } from '../services/authService';
import { presenceService } from '../services/presenceService';
import { channelService } from '../services/channelService';
import { imageUtils } from '../utils/imageUtils';
import './Profile.css';

interface ProfileProps {
  onClose: () => void;
  showProfile: boolean;
}

const Profile: React.FC<ProfileProps> = ({ onClose, showProfile }) => {
  const history = useHistory();
  const { user, userProfile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineVisibility, setOnlineVisibility] = useState<OnlineVisibility>('everyone');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setBio(userProfile.bio || '');
      setBirthDate(userProfile.birthDate || '');
      setPhotoURL(userProfile.photoURL || '');
      setOnlineVisibility(userProfile.onlineVisibility || 'everyone');
    }
  }, [userProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const base64 = await imageUtils.processAvatarImage(file);
      if (base64) {
        setPhotoURL(base64);
        await authService.updateUserProfile(user.uid, { photoURL: base64 });
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Ошибка при загрузке изображения');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Обновляем displayName на основе firstName и lastName
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || userProfile?.displayName || 'User';
      
      await authService.updateUserProfile(user.uid, {
        firstName,
        lastName,
        displayName,
        bio,
        birthDate,
        photoURL,
        onlineVisibility,
      });
      
      // Обновляем visibility в presence
      await presenceService.updateVisibility(user.uid, onlineVisibility);
      
      // Обновляем displayName в Firebase Auth
      const { updateProfile } = await import('firebase/auth');
      const { auth } = await import('../config/firebase');
      await updateProfile(auth.currentUser!, { displayName });
      
      await refreshProfile();
      alert('Профиль успешно сохранен!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при сохранении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const channelName = prompt('Введите название канала:');
      if (!channelName || !channelName.trim()) {
        setLoading(false);
        return;
      }
      
      const channelId = await channelService.createChannel(
        channelName.trim(),
        user.uid
      );
      alert('Канал успешно создан!');
      history.push('/channels');
      onClose();
    } catch (error: any) {
      console.error('Error creating channel:', error);
      alert(error.message || 'Ошибка при создании канала');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    history.push('/login');
  };

  return (
    <aside className={`profile ${showProfile ? '' : 'hidden'}`}>
      <div className="profile__overlay" onClick={onClose}></div>
      <div className="profile__panel">
        {/* Хедер профиля */}
        <header className="profile__header">
          <button 
            type="button"
            className="profile__close-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }} 
            aria-label="Закрыть профиль"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h2 className="profile__title">Профиль</h2>
          <button className="profile__edit-btn" onClick={handleSave} aria-label="Сохранить профиль">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </header>

        {/* Контент профиля */}
        <div className="profile__content">
          {/* Аватар и основная информация */}
          <section className="profile__main">
            <div className="profile__avatar-wrapper">
              <div className="profile__avatar">
                <img 
                  src={photoURL || imageUtils.generateAvatarUrl(userProfile?.displayName || 'User', '845ef7')} 
                  alt="Ваш аватар" 
                />
              </div>
              <label className="profile__avatar-upload" htmlFor="avatar-upload" aria-label="Изменить аватар">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" strokeWidth="2"/>
                </svg>
                <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </label>
            </div>
            
            <h3 className="profile__name">{userProfile?.displayName || 'Ваше Имя'}</h3>
            <p className="profile__username">@{userProfile?.email?.split('@')[0] || 'username'}</p>
            <p className="profile__bio">{userProfile?.bio || 'Добавьте информацию о себе...'}</p>
          </section>

          {/* Форма редактирования */}
          <form className="profile__form">
            <div className="profile__field">
              <label className="profile__field-label" htmlFor="first-name">
                <svg className="profile__field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                </svg>
                Имя
              </label>
              <input 
                type="text" 
                id="first-name" 
                className="profile__field-input" 
                placeholder="Введите имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="profile__field">
              <label className="profile__field-label" htmlFor="last-name">
                <svg className="profile__field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                </svg>
                Фамилия
              </label>
              <input 
                type="text" 
                id="last-name" 
                className="profile__field-input" 
                placeholder="Введите фамилию"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="profile__field">
              <label className="profile__field-label" htmlFor="birth-date">
                <svg className="profile__field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Дата рождения
              </label>
              <input 
                type="date" 
                id="birth-date" 
                className="profile__field-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="profile__field">
              <label className="profile__field-label" htmlFor="bio">
                <svg className="profile__field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                О себе
              </label>
              <textarea 
                id="bio" 
                className="profile__field-textarea" 
                placeholder="Расскажите о себе..."
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </form>

          {/* Личный канал */}
          <section className="profile__section">
            <h4 className="profile__section-title">
              <svg className="profile__section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Мой канал
            </h4>

            <article className="profile__channel">
              <div className="profile__channel-header">
                <div className="profile__channel-avatar">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#2AABEE"/>
                    <path d="M25 50h50M50 25v50" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="profile__channel-info">
                  <h5 className="profile__channel-name">Создать канал</h5>
                  <p className="profile__channel-subscribers">Поделитесь своими мыслями</p>
                </div>
              </div>
              
              <button className="profile__channel-btn" onClick={handleCreateChannel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 5v14m7-7H5" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Создать
              </button>
            </article>
          </section>

          {/* Дополнительные настройки */}
          <section className="profile__section">
            <h4 className="profile__section-title">
              <svg className="profile__section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                <path d="M12 1v6m0 6v6M3.34 6.34l4.24 4.24m8.48 0l4.24-4.24M1 12h6m6 0h6M3.34 17.66l4.24-4.24m8.48 0l4.24 4.24" strokeWidth="2"/>
              </svg>
              Настройки
            </h4>

            <nav className="profile__settings">
              <div className="profile__settings-item" onClick={() => setShowPrivacySettings(!showPrivacySettings)}>
                <svg className="profile__settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="profile__settings-text">Кто видит что я в сети?</span>
                <svg className={`profile__settings-arrow ${showPrivacySettings ? 'profile__settings-arrow--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {showPrivacySettings && (
                <div className="profile__privacy-options">
                  <label className="profile__privacy-option">
                    <input
                      type="radio"
                      name="onlineVisibility"
                      value="everyone"
                      checked={onlineVisibility === 'everyone'}
                      onChange={(e) => setOnlineVisibility(e.target.value as OnlineVisibility)}
                    />
                    <span>Все</span>
                  </label>
                  <label className="profile__privacy-option">
                    <input
                      type="radio"
                      name="onlineVisibility"
                      value="contacts"
                      checked={onlineVisibility === 'contacts'}
                      onChange={(e) => setOnlineVisibility(e.target.value as OnlineVisibility)}
                    />
                    <span>Контакты</span>
                  </label>
                  <label className="profile__privacy-option">
                    <input
                      type="radio"
                      name="onlineVisibility"
                      value="selected"
                      checked={onlineVisibility === 'selected'}
                      onChange={(e) => setOnlineVisibility(e.target.value as OnlineVisibility)}
                    />
                    <span>Выбранные пользователи</span>
                  </label>
                  <label className="profile__privacy-option">
                    <input
                      type="radio"
                      name="onlineVisibility"
                      value="nobody"
                      checked={onlineVisibility === 'nobody'}
                      onChange={(e) => setOnlineVisibility(e.target.value as OnlineVisibility)}
                    />
                    <span>Никто</span>
                  </label>
                </div>
              )}

              <a href="#" className="profile__settings-item" onClick={(e) => { e.preventDefault(); }}>
                <svg className="profile__settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="profile__settings-text">Данные и хранилище</span>
                <svg className="profile__settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>

              <a href="#" className="profile__settings-item" onClick={(e) => { e.preventDefault(); }}>
                <svg className="profile__settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 16v-4m0-4h.01" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="profile__settings-text">Помощь</span>
                <svg className="profile__settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </nav>
          </section>

          {/* Кнопка выхода */}
          <button className="profile__logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Profile;

