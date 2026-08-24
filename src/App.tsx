import { useEffect, useState } from 'react';
import { VoicePlayer } from './components/VoicePlayer';
import { AuthCallback } from './components/AuthCallback';
import { CredentialsForm } from './components/CredentialsForm';
import {
  getOpenAIApiKey,
  getSpotifyClientId,
  saveBrowserCredentials,
} from './services/credentials';
import { getAccessToken, getRedirectUri, initiateLogin } from './services/spotify';
import './App.css';

function App() {
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
        error instanceof Error ? error.message : 'Spotify 로그인을 시작하지 못했습니다.',
      );
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app login">
        <div className="login-card">
          <h1>Voice Music Player</h1>
          <p>음성으로 Spotify 노래를 재생하세요</p>
          <ul className="feature-list">
            <li>🎤 음성으로 노래 요청</li>
            <li>🤖 ChatGPT가 제목 추출</li>
            <li>🎵 Spotify에서 재생</li>
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
            <p>
              Spotify Dashboard → 앱 → Redirect URIs에 위 주소를 한 글자도 다르게 말고
              그대로 추가하세요. `localhost`는 사용할 수 없습니다.
            </p>
            <button
              type="button"
              className="copy-uri-button"
              onClick={async () => {
                await navigator.clipboard.writeText(redirectUri);
                setCopied(true);
              }}
            >
              {copied ? '복사됨' : 'URI 복사'}
            </button>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Dashboard 열기
            </a>
          </div>
          {loginError && <p className="login-error">{loginError}</p>}
          <button
            className="login-button"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Spotify로 이동 중...' : 'Spotify로 로그인'}
          </button>
          <p className="premium-note">* Spotify Premium 계정이 필요합니다</p>
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

export default App;
