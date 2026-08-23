import { useEffect, useState } from 'react';
import { VoicePlayer } from './components/VoicePlayer';
import { AuthCallback } from './components/AuthCallback';
import {
  getAccessToken,
  getConfiguredClientId,
  initiateLogin,
  saveSpotifyClientId,
} from './services/spotify';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [clientId, setClientId] = useState(getConfiguredClientId);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      saveSpotifyClientId(clientId);
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
          {!import.meta.env.VITE_SPOTIFY_CLIENT_ID && (
            <div className="client-id-field">
              <label htmlFor="spotify-client-id">Spotify Client ID</label>
              <input
                id="spotify-client-id"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="Spotify Developer Dashboard의 Client ID"
                autoComplete="off"
                spellCheck={false}
              />
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Client ID 확인하기
              </a>
            </div>
          )}
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
