# Настройка правил Firestore

## Проблема: Missing or insufficient permissions

Если вы видите эту ошибку, нужно настроить правила безопасности Firestore.

## Решение:

### Шаг 1: Откройте Firebase Console

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. В левом меню выберите **Firestore Database**
4. Перейдите на вкладку **Rules**

### Шаг 2: Скопируйте правила

Скопируйте содержимое файла `firestore.rules` из корня проекта и вставьте в редактор правил в Firebase Console.

Или используйте эти правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Правила для пользователей
    match /users/{userId} {
      // Пользователь может читать любой профиль
      allow read: if true;
      // Пользователь может обновлять только свой профиль
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Правила для чатов
    match /chats/{chatId} {
      // Пользователь может читать чаты, в которых он участник
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      // Пользователь может создавать чаты
      allow create: if request.auth != null;
      // Пользователь может обновлять чаты, в которых он участник
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
    
    // Правила для сообщений
    match /messages/{messageId} {
      // Пользователь может читать сообщения из чатов, в которых он участник
      allow read: if request.auth != null;
      // Пользователь может создавать сообщения
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.senderId;
      // Пользователь может обновлять только свои сообщения
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.senderId;
    }
    
    // Правила для каналов
    match /channels/{channelId} {
      // Пользователь может читать каналы
      allow read: if true;
      // Пользователь может создавать каналы
      allow create: if request.auth != null;
      // Создатель канала может обновлять его
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.createdBy || 
         request.auth.uid in resource.data.subscribers);
    }
  }
}
```

### Шаг 3: Опубликуйте правила

1. Нажмите кнопку **Publish** (Опубликовать)
2. Дождитесь подтверждения

### Важно:

- Правила применяются сразу после публикации
- Если правила не работают, проверьте, что пользователь авторизован
- Для тестирования можно временно использовать более открытые правила (не рекомендуется для продакшена)

