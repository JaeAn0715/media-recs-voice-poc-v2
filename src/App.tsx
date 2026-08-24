import { useEffect, useState } from 'react';
import { LanguageToggle } from './components/LanguageToggle';
import { VoicePlayer } from './components/VoicePlayer';
import { AuthCallback } from './components/AuthCallback';
import { CredentialsForm } from './components/CredentialsForm';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import {
  getOpenAIApiKey,
  getSpotifyClientId,
  saveBrowserCredentials,
} from './services/credentials';
import { getAccessToken, getRedirectUri, initiateLogin } from './services/spotify';
import './App.css';

function AppShell() {
  const { t } = useLocale();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [clientId, setClientId] = useState(getSpotifyClientId);
  const [openAIApiKey, setOpenAIApiKey] = useState(getOpenAIApiKey);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const redirectUri = getRedirectUri();

  const isCallback = window.location.pathname === '/callback';

  useEffect(() => {
    if (!isCallback) {
      setIsAuthenticated(!!getAccessToken());
      setIsChecking(false);
    }
  }, [isCallback]);

  if (isCallback) {
    return <AuthCallback />;
  }

  if (isChecking) {
    return (
      <div className="app loading">
        <div className="spinner" />
      </div>
    );
  }

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      saveBrowserCredentials(clientId, openAIApiKey);
      await initiateLogin();
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : t('loginFailed'),
      );
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app login">
        <div className="login-card">
          <h1>{t('appTitle')}</h1>
          <p>{t('loginSubtitle')}</p>
          <ul className="feature-list">
            <li>{t('featureVoice')}</li>
            <li>{t('featureGpt')}</li>
            <li>{t('featurePlay')}</li>
          </ul>
          <CredentialsForm
            clientId={clientId}
            openAIApiKey={openAIApiKey}
            onClientIdChange={setClientId}
            onOpenAIApiKeyChange={setOpenAIApiKey}
          />
          <div className="redirect-uri-box">
            <span className="label">Spotify Redirect URI</span>
            <code>{redirectUri}</code>
            <p>{t('redirectUriHint')}</p>
            <button
              type="button"
              className="copy-uri-button"
              onClick={async () => {
                await navigator.clipboard.writeText(redirectUri);
                setCopied(true);
              }}
            >
              {copied ? t('copied') : t('copyUri')}
            </button>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              {t('openDashboard')}
            </a>
          </div>
          {loginError && <p className="login-error">{loginError}</p>}
          <button
            className="login-button"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? t('loggingIn') : t('loginButton')}
          </button>
          <p className="premium-note">{t('premiumNote')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <VoicePlayer />
    </div>
  );
}

function App() {
  return (
    <LocaleProvider>
      <LanguageToggle />
      <AppShell />
    </LocaleProvider>
  );
}

export default App;
