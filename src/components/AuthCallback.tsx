import { useEffect, useState } from 'react';
import { handleAuthCallback } from '../services/spotify';

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const authError = params.get('error');

    if (authError) {
      setError(`Spotify 인증 거부: ${authError}`);
      return;
    }

    if (!code) {
      setError('인증 코드가 없습니다.');
      return;
    }

    handleAuthCallback(code, state)
      .then(() => {
        window.location.href = '/';
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '인증 처리 실패');
      });
  }, []);

  if (error) {
    return (
      <div className="auth-callback">
        <p className="error-text">{error}</p>
        <a href="/">돌아가기</a>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="spinner" />
      <p>Spotify 로그인 처리 중...</p>
    </div>
  );
}
