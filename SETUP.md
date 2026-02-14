# 🚀 Быстрая настройка проекта

## Проблема: `auth/invalid-api-key`

Если вы видите эту ошибку, значит файл `.env` не настроен правильно.

## Решение:

### Шаг 1: Создайте файл `.env`

**ВАЖНО**: Файл должен называться `.env` (БЕЗ `.txt` в конце!)

1. В корне проекта создайте файл с именем `.env`
2. НЕ используйте `.env.txt` - Vite его не прочитает!

### Шаг 2: Получите данные из Firebase

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Нажмите ⚙️ (шестеренка) > **Project settings**
4. Прокрутите до раздела **"Your apps"**
5. Если приложения нет:
   - Нажмите **"Add app"** 
   - Выберите **Web (</>)** иконку
   - Зарегистрируйте приложение
6. Скопируйте значения из объекта `firebaseConfig`

### Шаг 3: Заполните `.env`

Откройте файл `.env` и вставьте ваши данные:

```env
VITE_FIREBASE_API_KEY=AIzaSy...ваш-реальный-ключ-здесь
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Пример реальных данных:**
```env
VITE_FIREBASE_API_KEY=AIzaSyC7xK9mN3pQrS2tUvW5yZ8aB1cD4eF6gH9iJ0kL
VITE_FIREBASE_AUTH_DOMAIN=my-messenger-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-messenger-12345
VITE_FIREBASE_STORAGE_BUCKET=my-messenger-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:abc123def456
```

### Шаг 4: Перезапустите сервер

После создания/изменения `.env`:

```bash
# Остановите текущий сервер (Ctrl+C)
# Затем запустите снова:
npm run dev
```

## Проверка

После перезапуска в консоли браузера вы НЕ должны видеть ошибку `auth/invalid-api-key`.

Если ошибка осталась:
1. Убедитесь, что файл называется `.env` (не `.env.txt`)
2. Проверьте, что все переменные заполнены реальными значениями
3. Убедитесь, что нет пробелов вокруг `=`
4. Перезапустите dev сервер

## Структура файла `.env`

```
MessengerCosplayer/
├── .env          ← Этот файл нужен (создайте его!)
├── .env.txt      ← Этот файл можно удалить
├── .env.example  ← Пример (можно использовать как шаблон)
└── ...
```

