import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    // Инициализация темы при первой загрузке
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  // Применяем тему к body при изменении
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    
    // Обновляем чекбокс темы
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (themeToggle) {
      themeToggle.checked = theme === 'dark';
    }
  }, [theme]);

  useEffect(() => {
    // Синхронизируем с профилем пользователя только при первой загрузке
    if (userProfile?.theme && userProfile.theme !== theme) {
      // Применяем тему из профиля только если она отличается от текущей
      // и текущая тема была установлена из localStorage
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (!savedTheme || savedTheme === userProfile.theme) {
        setTheme(userProfile.theme);
      }
    }
  }, [userProfile]); // Убрали theme из зависимостей чтобы избежать циклов

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Сохраняем в localStorage сразу
    localStorage.setItem('theme', newTheme);
    
    // Применяем к body
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Обновляем чекбокс темы
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (themeToggle) {
      themeToggle.checked = newTheme === 'dark';
    }
    
    // Сохраняем в профиль пользователя асинхронно
    if (user) {
      try {
        await authService.updateUserProfile(user.uid, { theme: newTheme });
      } catch (error) {
        console.error('Error saving theme to profile:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

