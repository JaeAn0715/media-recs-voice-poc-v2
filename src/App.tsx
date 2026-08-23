import { useEffect, useState } from 'react';
import { VoicePlayer } from './components/VoicePlayer';
import { AuthCallback } from './components/AuthCallback';
import { getAccessToken, initiateLogin } from './services/spotify';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

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
          <button className="login-button" onClick={() => initiateLogin()}>
            Spotify로 로그인
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
