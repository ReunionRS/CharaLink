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
  IonInput,
  IonTextarea,
  IonAvatar,
  IonText,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { imageUtils } from '../utils/imageUtils';
import './ProfileEdit.css';

const ProfileEdit: React.FC = () => {
  const history = useHistory();
  const { user, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setBio(userProfile.bio || '');
      setBirthDate(userProfile.birthDate || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      // Конвертируем изображение в Base64 (без Firebase Storage)
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
      await authService.updateUserProfile(user.uid, {
        displayName,
        firstName,
        lastName,
        bio,
        birthDate,
        photoURL,
      });
      await refreshProfile();
      history.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Редактировать профиль</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} disabled={loading}>
              Сохранить
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="profile-edit-content">
          <div className="avatar-section">
            <IonAvatar className="profile-avatar-large">
              <img
                src={photoURL || imageUtils.generateAvatarUrl(displayName || 'User', '845ef7')}
                alt="Avatar"
              />
            </IonAvatar>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              id="avatar-upload"
              style={{ display: 'none' }}
            />
            <IonButton
              fill="outline"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={loading}
            >
              Изменить фото
            </IonButton>
          </div>

          <IonItem>
            <IonLabel position="stacked">Имя</IonLabel>
            <IonInput
              value={firstName}
              onIonInput={(e) => setFirstName(e.detail.value!)}
              placeholder="Введите имя"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Фамилия</IonLabel>
            <IonInput
              value={lastName}
              onIonInput={(e) => setLastName(e.detail.value!)}
              placeholder="Введите фамилию"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Отображаемое имя</IonLabel>
            <IonInput
              value={displayName}
              onIonInput={(e) => setDisplayName(e.detail.value!)}
              placeholder="Введите имя"
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Дата рождения</IonLabel>
            <IonInput
              type="date"
              value={birthDate}
              onIonInput={(e) => setBirthDate(e.detail.value!)}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">О себе</IonLabel>
            <IonTextarea
              value={bio}
              onIonInput={(e) => setBio(e.detail.value!)}
              placeholder="Расскажите о себе..."
              rows={3}
            />
          </IonItem>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfileEdit;

