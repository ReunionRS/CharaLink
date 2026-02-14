import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

const Login: React.FC = () => {
  const history = useHistory();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await authService.signIn(email, password);
        history.push('/home');
      } else {
        await authService.signUp(email, password, displayName);
        history.push('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithGoogle();
      history.push('/home');
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <section className="auth" id="auth-screen">
          <div className="auth__container">
            <div className="auth__content">
              {/* Логотип */}
              <div className="auth__logo">
                <svg className="auth__logo-icon" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="120" cy="120" r="120" fill="url(#gradient)"/>
                  <path d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89L81.737 118.6" fill="#c8daea"/>
                  <path d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0 17.415-15.763 17.415-15.763" fill="#a9c6d8"/>
                  <path d="M81.486 130.178l-20.626-6.96s-2.46-.96-1.67-3.11c.162-.434.475-.813 1.185-1.25 3.237-2.042 60.013-22.945 60.013-22.945s2.04-.6 3.33-.188c.543.172 1.048.458 1.22 1.007.114.365.132.75.132 1.13-.088 1.256-.475 5.5-.475 5.5s-5.756 36.637-8.204 48.937c-.174 1.088-.75 1.462-1.638 1.75-.988.32-2.338-.188-2.338-.188l-23.638-17.374" fill="url(#gradient2)"/>
                  <defs>
                    <linearGradient id="gradient" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2AABEE"/>
                      <stop offset="1" stopColor="#229ED9"/>
                    </linearGradient>
                    <linearGradient id="gradient2" x1="98.5" y1="96.5" x2="98.5" y2="151" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#EFF7FC"/>
                      <stop offset="1" stopColor="white"/>
                    </linearGradient>
                  </defs>
                </svg>
                <h1 className="auth__title">Messenger</h1>
              </div>

              {/* Описание */}
              <p className="auth__description">
                {isLogin ? 'Войдите в свой аккаунт, чтобы начать общение' : 'Создайте аккаунт, чтобы начать общение'}
              </p>

              {/* Форма авторизации */}
              <form className="auth__form" onSubmit={handleSubmit}>
                {/* Кнопка Google */}
                <button 
                  type="button" 
                  className="auth__button auth__button--google"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="auth__button-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Войти через Google
                </button>

                {/* Разделитель */}
                <div className="auth__divider">
                  <span className="auth__divider-text">или</span>
                </div>

                {!isLogin && (
                  <div className="auth__input-group">
                    <label htmlFor="displayName" className="auth__label">Имя</label>
                    <input 
                      type="text" 
                      id="displayName" 
                      className="auth__input" 
                      placeholder="Введите имя"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Поле Email */}
                <div className="auth__input-group">
                  <label htmlFor="email" className="auth__label">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    className="auth__input" 
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Поле Password */}
                <div className="auth__input-group">
                  <label htmlFor="password" className="auth__label">Пароль</label>
                  <input 
                    type="password" 
                    id="password" 
                    className="auth__input" 
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Забыли пароль */}
                {isLogin && (
                  <a href="#" className="auth__link" onClick={(e) => { e.preventDefault(); }}>
                  Забыли пароль?
                </a>
                )}

                {/* Кнопка входа */}
                <button 
                  type="submit" 
                  className="auth__button auth__button--primary"
                  disabled={loading}
                >
                  {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>

                {/* Регистрация */}
                <p className="auth__footer">
                  {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                  <a 
                    href="#" 
                    className="auth__link auth__link--bold"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsLogin(!isLogin);
                    }}
                  >
                    {isLogin ? 'Зарегистрироваться' : 'Войти'}
                  </a>
                </p>
              </form>

              {error && (
                <div style={{ color: 'var(--color-danger)', marginTop: '16px', textAlign: 'center' }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>
      </IonContent>
    </IonPage>
  );
};

export default Login;
