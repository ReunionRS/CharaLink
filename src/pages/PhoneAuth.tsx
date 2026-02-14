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
  IonText,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { auth, setupRecaptcha, PhoneAuthProvider, signInWithCredential } from '../config/firebase';
import './PhoneAuth.css';

const PhoneAuth: React.FC = () => {
  const history = useHistory();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);

  useEffect(() => {
    // Setup reCAPTCHA
    const verifier = setupRecaptcha('recaptcha-container');
    setRecaptchaVerifier(verifier);

    return () => {
      if (verifier) {
        verifier.clear();
      }
    };
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber.trim() || !recaptchaVerifier) return;

    setLoading(true);
    setError(null);

    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const confirmation = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier
      );
      setConfirmationResult(confirmation);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !confirmationResult) return;

    setLoading(true);
    setError(null);

    try {
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode
      );
      await signInWithCredential(auth, credential);
      history.push('/home');
    } catch (err: any) {
      setError(err.message || 'Неверный код подтверждения');
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
          <IonTitle>Вход по SMS</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="phone-auth-content">
          <div className="phone-auth-form">
            {!confirmationResult ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Номер телефона</IonLabel>
                  <IonInput
                    type="tel"
                    value={phoneNumber}
                    onIonInput={(e) => setPhoneNumber(e.detail.value!)}
                    placeholder="+7 (999) 123-45-67"
                  />
                </IonItem>

                <div id="recaptcha-container"></div>

                <IonButton
                  expand="block"
                  onClick={handleSendCode}
                  disabled={!phoneNumber.trim() || loading}
                >
                  {loading ? <IonSpinner /> : 'Отправить код'}
                </IonButton>
              </>
            ) : (
              <>
                <IonText>
                  <p>Код подтверждения отправлен на {phoneNumber}</p>
                </IonText>

                <IonItem>
                  <IonLabel position="stacked">Код подтверждения</IonLabel>
                  <IonInput
                    type="number"
                    value={verificationCode}
                    onIonInput={(e) => setVerificationCode(e.detail.value!)}
                    placeholder="Введите код из SMS"
                    maxlength={6}
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  onClick={handleVerifyCode}
                  disabled={!verificationCode.trim() || loading}
                >
                  {loading ? <IonSpinner /> : 'Подтвердить'}
                </IonButton>

                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => {
                    setConfirmationResult(null);
                    setVerificationCode('');
                  }}
                >
                  Изменить номер
                </IonButton>
              </>
            )}
          </div>
        </div>

        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => setError(null)}
          header="Ошибка"
          message={error || ''}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default PhoneAuth;

