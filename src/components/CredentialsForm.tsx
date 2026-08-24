import { useLocale } from '../context/LocaleContext';

interface CredentialsFormProps {
  clientId: string;
  openAIApiKey: string;
  onClientIdChange: (value: string) => void;
  onOpenAIApiKeyChange: (value: string) => void;
}

export function CredentialsForm({
  clientId,
  openAIApiKey,
  onClientIdChange,
  onOpenAIApiKeyChange,
}: CredentialsFormProps) {
  const { t } = useLocale();

  return (
    <div className="credentials-form">
      <div className="client-id-field">
        <label htmlFor="spotify-client-id">Spotify Client ID</label>
        <input
          id="spotify-client-id"
          value={clientId}
          onChange={(event) => onClientIdChange(event.target.value)}
          placeholder={t('clientIdPlaceholder')}
          autoComplete="off"
          spellCheck={false}
        />
        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
          {t('clientIdLink')}
        </a>
        <p className="credentials-hint">{t('clientSecretHint')}</p>
      </div>
      <div className="client-id-field">
        <label htmlFor="openai-api-key">OpenAI API Key</label>
        <input
          id="openai-api-key"
          type="password"
          value={openAIApiKey}
          onChange={(event) => onOpenAIApiKeyChange(event.target.value)}
          placeholder="sk-..."
          autoComplete="off"
          spellCheck={false}
        />
        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
          {t('openaiKeyLink')}
        </a>
      </div>
      <p className="credentials-hint">{t('keysStoredHint')}</p>
    </div>
  );
}
