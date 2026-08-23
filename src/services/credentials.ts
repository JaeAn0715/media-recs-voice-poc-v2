const SPOTIFY_CLIENT_ID_KEY = 'spotify_client_id';
const OPENAI_API_KEY_KEY = 'openai_api_key';

function readLocal(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() || '';
  } catch {
    return '';
  }
}

function writeLocal(key: string, value: string): void {
  localStorage.setItem(key, value.trim());
}

export function getSpotifyClientId(): string {
  return readLocal(SPOTIFY_CLIENT_ID_KEY) || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
}

export function saveSpotifyClientId(clientId: string): void {
  const normalized = clientId.trim();
  if (!normalized) {
    throw new Error('Spotify Client ID를 입력해 주세요.');
  }
  writeLocal(SPOTIFY_CLIENT_ID_KEY, normalized);
}

export function getOpenAIApiKey(): string {
  return readLocal(OPENAI_API_KEY_KEY) || import.meta.env.VITE_OPENAI_API_KEY || '';
}

export function saveOpenAIApiKey(apiKey: string): void {
  const normalized = apiKey.trim();
  if (!normalized) {
    throw new Error('OpenAI API Key를 입력해 주세요.');
  }
  writeLocal(OPENAI_API_KEY_KEY, normalized);
}

export function saveBrowserCredentials(clientId: string, openAIApiKey: string): void {
  saveSpotifyClientId(clientId);
  saveOpenAIApiKey(openAIApiKey);
}
