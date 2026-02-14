import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { presenceService, PresenceData } from '../services/presenceService';
import { authService } from '../services/authService';

interface ChatOnlineIndicatorProps {
  chatId: string;
  otherUserId?: string;
}

const ChatOnlineIndicator: React.FC<ChatOnlineIndicatorProps> = ({ chatId, otherUserId }) => {
  const { user } = useAuth();
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!otherUserId || !user) return;

    // Загружаем профиль другого пользователя
    authService.getUserProfile(otherUserId).then(setOtherUserProfile);

    // Подписываемся на статус онлайн
    const unsubscribe = presenceService.subscribeToPresence(otherUserId, (presenceData) => {
      setPresence(presenceData);
    });

    return () => unsubscribe();
  }, [otherUserId, user]);

  if (!presence || !otherUserProfile || !user) return null;

  const canSee = presenceService.canSeeOnlineStatus(
    otherUserId!,
    presence.visibility,
    presence.visibleTo || [],
    user.uid,
    true // Считаем что если есть чат, то это контакт
  );

  if (!canSee || !presence.isOnline) return null;

  return <span className="avatar-online-indicator"></span>;
};

export default ChatOnlineIndicator;

