# Messenger Cosplayer - Telegram Clone

Мессенджер на базе Ionic React + TypeScript + Firebase

## Возможности

- ✅ Авторизация и регистрация (Email/Password, Google, SMS)
- ✅ Отправка кода по SMS
- ✅ Общение между пользователями (личные чаты)
- ✅ Настройка профиля (имя, фото, биография)
- ✅ Переключение темы (светлая/темная)
- ✅ Создание каналов (как в Telegram)
- ✅ Все данные хранятся в Firebase

## Настройка

### 1. Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите следующие сервисы:
   - Authentication (Email/Password, Google, Phone)
   - Firestore Database
3. Получите конфигурацию Firebase:
   - Откройте Firebase Console > ваш проект
   - Нажмите на иконку шестеренки (⚙️) > **Project settings**
   - Прокрутите вниз до раздела **"Your apps"**
   - Если приложения нет, нажмите **"Add app"** > выберите **Web (</>)**
   - Скопируйте значения из объекта `firebaseConfig`

4. **ВАЖНО**: Создайте файл `.env` в корне проекта (НЕ `.env.txt`!)

   ```bash
   # Скопируйте .env.example в .env
   cp .env.example .env
   ```

   Или создайте файл `.env` вручную и заполните его:

   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...ваш-реальный-ключ
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

   **⚠️ ВАЖНО**: 
   - Файл должен называться именно `.env` (без `.txt`!)
   - После создания/изменения `.env` **перезапустите** dev сервер
   - Замените все значения на реальные из Firebase Console

### 2. Настройка Firestore

Создайте следующие коллекции в Firestore (они создадутся автоматически при использовании):

- `users` - профили пользователей
- `chats` - чаты (личные, групповые, каналы)
- `messages` - сообщения
- `channels` - каналы

**Примечание**: Firebase Storage не используется. Аватары хранятся в Base64 формате прямо в Firestore (до 1MB на документ).

### 3. Настройка Authentication

В Firebase Console > Authentication:
1. Включите Email/Password
2. Включите Google (добавьте OAuth client ID)
3. Включите Phone (настройте reCAPTCHA)

**Примечание**: Firebase Storage не требуется, можно пропустить его настройку.

### 4. Установка зависимостей

```bash
npm install
```

### 5. Запуск проекта

```bash
npm run dev
```

## Структура проекта

```
src/
├── components/          # React компоненты
│   └── ChatWindow.tsx  # Окно чата
├── config/            # Конфигурация
│   └── firebase.ts    # Настройка Firebase
├── contexts/          # React Context
│   ├── AuthContext.tsx  # Контекст авторизации
│   └── ThemeContext.tsx # Контекст темы
├── pages/             # Страницы приложения
│   ├── Login.tsx      # Авторизация
│   ├── PhoneAuth.tsx  # SMS авторизация
│   ├── Home.tsx       # Главная (чаты)
│   ├── ProfileEdit.tsx # Редактирование профиля
│   └── Channels.tsx   # Каналы
└── services/          # Сервисы
    ├── authService.ts    # Авторизация
    ├── chatService.ts    # Чаты и сообщения
    └── channelService.ts # Каналы
```

## Использование

1. **Регистрация/Вход**: Используйте Email/Password, Google или SMS
2. **Профиль**: Нажмите на аватар в левом верхнем углу
3. **Чаты**: Выберите чат из списка для начала общения
4. **Каналы**: Перейдите в "Мои каналы" для создания канала
5. **Тема**: Переключите тему кнопкой в хедере

## Технологии

- **Ionic React** - UI фреймворк
- **TypeScript** - типизация
- **Firebase** - бэкенд (Auth, Firestore, Storage)
- **React Router** - маршрутизация

## Лицензия

MIT

