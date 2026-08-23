import { generateCodeChallenge, generateCodeVerifier } from './pkce';
import type { SpotifyTrack } from '../types';

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
const VERIFIER_KEY = 'spotify_code_verifier';

function getClientId(): string {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
  }
  return clientId;
}

function getRedirectUri(): string {
  return import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    clearTokens();
    return null;
  }
  return token;
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

function storeToken(accessToken: string, expiresIn: number): void {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000 - 60000));
}

export async function initiateLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function handleAuthCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getClientId(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify 인증 실패: ${error}`);
  }

  const data = await response.json();
  storeToken(data.access_token, data.expires_in);
  sessionStorage.removeItem(VERIFIER_KEY);
}

export async function searchTrack(title: string, artist?: string): Promise<SpotifyTrack> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Spotify에 로그인이 필요합니다.');
  }

  const query = artist ? `track:${title} artist:${artist}` : title;
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '5',
  });

  const response = await fetch(`${SPOTIFY_API_URL}/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify 검색 실패: ${error}`);
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

export async function playTrack(trackUri: string, deviceId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Spotify에 로그인이 필요합니다.');
  }

  const response = await fetch(
    `${SPOTIFY_API_URL}/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    },
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`재생 실패: ${error}`);
  }
}

export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const existing = document.getElementById('spotify-player-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Spotify SDK 로드 실패')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Spotify SDK 로드 실패'));
    document.body.appendChild(script);
  });
}
