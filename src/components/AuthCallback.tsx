import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { handleAuthCallback } from '../services/spotify';

export function AuthCallback() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const authError = params.get('error');

    if (authError) {
      setError(t('authDenied', { error: authError }));
      return;
    }

    if (!code) {
      setError(t('noAuthCode'));
      return;
    }

    handleAuthCallback(code, state)
      .then(() => {
        window.location.href = '/';
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('authFailed'));
      });
  }, [t]);

  if (error) {
    return (
      <div className="auth-callback">
        <p className="error-text">{error}</p>
        <a href="/">{t('goBack')}</a>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="spinner" />
      <p>{t('authProcessing')}</p>
    </div>
  );
}
