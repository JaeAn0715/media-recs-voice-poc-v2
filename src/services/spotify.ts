import { getSpotifyClientId as readStoredClientId } from './credentials';
import { fetchWithTimeout, readApiError } from './http';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';
import type { RecommendedTrack, SpotifyTrack } from '../types';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

const TOKEN_KEY = 'spotify_access_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const VERIFIER_KEY = 'spotify_code_verifier';
const AUTH_STATE_KEY = 'spotify_auth_state';
const REDIRECT_URI_KEY = 'spotify_redirect_uri';
const TOKEN_EXPIRY_BUFFER_MS = 60000;

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

let refreshPromise: Promise<string> | null = null;

export function getConfiguredClientId(): string {
  return readStoredClientId();
}

function getClientId(): string {
  const clientId = getConfiguredClientId();
  if (!clientId) {
    throw new Error(
      'Spotify Client ID가 없습니다. Developer Dashboard의 Client ID를 입력해 주세요.',
    );
  }
  return clientId;
}

export function getRedirectUri(): string {
  const origin = window.location.origin
    .replace(/\/$/, '')
    .replace('http://localhost', 'http://127.0.0.1');
  return `${origin}/callback`;
}

export function getAccessToken(): string | null {
  migrateSessionTokens();
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    return null;
  }
  return token;
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  clearPendingAuth();
}

function clearPendingAuth(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(AUTH_STATE_KEY);
  sessionStorage.removeItem(REDIRECT_URI_KEY);
}

function migrateSessionTokens(): void {
  const localToken = localStorage.getItem(TOKEN_KEY);
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  const sessionExpiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!localToken && sessionToken && sessionExpiry) {
    localStorage.setItem(TOKEN_KEY, sessionToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, sessionExpiry);
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

function storeToken(data: SpotifyTokenResponse): void {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(
    TOKEN_EXPIRY_KEY,
    String(Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS),
  );
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('Spotify에 다시 로그인이 필요합니다.');
  }

  const response = await fetchWithTimeout(
    SPOTIFY_TOKEN_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: getClientId(),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    },
    'Spotify 로그인 갱신',
  );

  if (!response.ok) {
    const detail = await readApiError(response);
    if (response.status === 400 || response.status === 401) {
      clearTokens();
    }
    throw new Error(`Spotify 로그인 갱신 실패: ${detail}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;
  storeToken(data);
  return data.access_token;
}

export async function ensureValidAccessToken(): Promise<string> {
  const token = getAccessToken();
  if (token) return token;

  if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
    throw new Error('Spotify에 로그인이 필요합니다.');
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function initiateLogin(): Promise<void> {
  const clientId = getClientId();
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier();
  const redirectUri = getRedirectUri();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(AUTH_STATE_KEY, state);
  sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.assign(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}

export async function handleAuthCallback(code: string, state: string | null): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(AUTH_STATE_KEY);
  const redirectUri = sessionStorage.getItem(REDIRECT_URI_KEY) || getRedirectUri();
  if (!verifier) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해 주세요.');
  }
  if (!state || !expectedState || state !== expectedState) {
    clearTokens();
    throw new Error('Spotify 인증 상태가 일치하지 않습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify 인증 실패: ${error}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;
  storeToken(data);
  clearPendingAuth();
}

export async function searchTrack(title: string, artist?: string): Promise<SpotifyTrack> {
  const token = await ensureValidAccessToken();

  const query = [title, artist].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '5',
    market: 'from_token',
  });

  const response = await fetchWithTimeout(
    `${SPOTIFY_API_URL}/search?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    'Spotify 검색',
  );

  if (response.status === 401) {
    throw new Error('Spotify 로그인이 만료되었습니다. 다시 로그인해 주세요.');
  }

  if (!response.ok) {
    throw new Error(`Spotify 검색 실패: ${await readApiError(response)}`);
  }

  const data = await response.json();
  const tracks: SpotifyTrack[] = data.tracks?.items ?? [];

  if (tracks.length === 0) {
    throw new Error(`"${title}" 노래를 Spotify에서 찾을 수 없습니다.`);
  }

  const playable = tracks.find((t) => t.is_playable !== false) ?? tracks[0];

  if (playable.is_playable === false) {
    throw new Error(`"${playable.name}"은(는) 현재 재생할 수 없는 곡입니다.`);
  }

  return playable;
}

export async function searchPlayableTrack(title: string, artist?: string): Promise<SpotifyTrack | null> {
  try {
    return await searchTrack(title, artist);
  } catch {
    return null;
  }
}

export function getSpotifyTrackUrl(track: SpotifyTrack): string {
  return track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`;
}

export function toRecommendedTrack(
  track: SpotifyTrack,
  reason?: string,
): RecommendedTrack {
  return {
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(', '),
    id: track.id,
    uri: track.uri,
    spotifyUrl: getSpotifyTrackUrl(track),
    albumImage: track.album.images[0]?.url,
    reason,
  };
}

export async function resolveRecommendedTracks(
  suggestions: { title: string; artist: string; reason?: string }[],
  excludeIds: Set<string>,
  onProgress?: (done: number, total: number) => void,
  limit = 10,
): Promise<RecommendedTrack[]> {
  const resolved: RecommendedTrack[] = [];
  const seen = new Set(excludeIds);

  for (let index = 0; index < suggestions.length && resolved.length < limit; index += 1) {
    const suggestion = suggestions[index];
    const withArtist = await searchPlayableTrack(suggestion.title, suggestion.artist || undefined);
    const track =
      withArtist ??
      (suggestion.artist ? await searchPlayableTrack(suggestion.title) : null);
    onProgress?.(index + 1, suggestions.length);

    if (!track || seen.has(track.id)) {
      continue;
    }

    seen.add(track.id);
    resolved.push(toRecommendedTrack(track, suggestion.reason));
  }

  return resolved;
}

export async function transferPlayback(deviceId: string, play = false): Promise<void> {
  const token = await ensureValidAccessToken();

  const response = await fetchWithTimeout(
    `${SPOTIFY_API_URL}/me/player`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    },
    'Spotify 기기 전환',
  );

  if (!response.ok && response.status !== 204 && response.status !== 202) {
    throw new Error(`재생 기기 전환 실패: ${await readApiError(response)}`);
  }
}

export async function playTrack(trackUri: string, deviceId: string): Promise<void> {
  const token = await ensureValidAccessToken();

  await transferPlayback(deviceId, false);

  const response = await fetchWithTimeout(
    `${SPOTIFY_API_URL}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    },
    'Spotify 재생',
  );

  if (response.status === 404) {
    await transferPlayback(deviceId, true);
    const retry = await fetchWithTimeout(
      `${SPOTIFY_API_URL}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      },
      'Spotify 재생',
    );
    if (!retry.ok && retry.status !== 204 && retry.status !== 202) {
      throw new Error(`재생 실패: ${await readApiError(retry)}`);
    }
    return;
  }

  if (!response.ok && response.status !== 204 && response.status !== 202) {
    throw new Error(`재생 실패: ${await readApiError(response)}`);
  }
}

export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const previous = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previous?.();
      resolve();
    };

    if (document.getElementById('spotify-player-sdk')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => reject(new Error('Spotify SDK 로드 실패'));
    document.body.appendChild(script);
  });
}
