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
  return (
    <div className="credentials-form">
      <div className="client-id-field">
        <label htmlFor="spotify-client-id">Spotify Client ID</label>
        <input
          id="spotify-client-id"
          value={clientId}
          onChange={(event) => onClientIdChange(event.target.value)}
          placeholder="Spotify Developer Dashboard의 Client ID"
          autoComplete="off"
          spellCheck={false}
        />
        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
          Client ID 확인하기
        </a>
        <p className="credentials-hint">
          Client Secret(Key)는 넣지 마세요. 브라우저 앱은 Spotify PKCE라 Client ID만
          사용하고, 로그인 후 Access Token이 Open API 키 역할을 합니다.
        </p>
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
          API Key 확인하기
        </a>
      </div>
      <p className="credentials-hint">입력한 키는 이 브라우저의 localStorage에만 저장됩니다.</p>
    </div>
  );
}
