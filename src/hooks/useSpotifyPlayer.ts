import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAccessToken,
  loadSpotifySDK,
  playTrack,
} from '../services/spotify';
import type { SpotifyPlayer } from '../types';

export function useSpotifyPlayer() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  const initializePlayer = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      await loadSpotifySDK();

      const player = new window.Spotify.Player({
        name: 'Voice Music Player',
        getOAuthToken: (cb) => cb(getAccessToken() ?? ''),
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setIsReady(true);
        setPlayerError(null);
      });

      player.addListener('not_ready', () => {
        setIsReady(false);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        setPlayerError(`플레이어 초기화 오류: ${message}`);
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        setPlayerError(`인증 오류: ${message}`);
      });

      player.addListener('account_error', ({ message }: { message: string }) => {
        setPlayerError(`계정 오류: ${message}. Spotify Premium이 필요합니다.`);
      });

      player.addListener('playback_error', ({ message }: { message: string }) => {
        setPlayerError(`재생 오류: ${message}`);
      });

      playerRef.current = player;
      const connected = await player.connect();
      if (!connected) {
        setPlayerError('Spotify 플레이어 연결에 실패했습니다.');
      }
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : '플레이어 초기화 실패');
    }
  }, []);

  useEffect(() => {
    initializePlayer();

    return () => {
      playerRef.current?.disconnect();
    };
  }, [initializePlayer]);

  const play = useCallback(
    async (trackUri: string) => {
      if (!deviceId) {
        throw new Error('Spotify 플레이어가 준비되지 않았습니다.');
      }
      await playTrack(trackUri, deviceId);
    },
    [deviceId],
  );

  return {
    deviceId,
    isReady,
    playerError,
    play,
  };
}
