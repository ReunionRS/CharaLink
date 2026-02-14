import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Login from './pages/Login';
import PhoneAuth from './pages/PhoneAuth';
import ProfileEdit from './pages/ProfileEdit';
import Channels from './pages/Channels';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

/* Глобальные стили из оригинального дизайна */
import './styles/global.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <ThemeProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login">
              <Login />
            </Route>
            <Route exact path="/phone-auth">
              <PhoneAuth />
            </Route>
            <Route exact path="/home">
              <Home />
            </Route>
            <Route exact path="/profile/edit">
              <ProfileEdit />
            </Route>
            <Route exact path="/channels">
              <Channels />
            </Route>
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
        </IonReactRouter>
      </ThemeProvider>
    </AuthProvider>
  </IonApp>
);

export default App;
