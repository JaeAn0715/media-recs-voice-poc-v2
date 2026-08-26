import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ensureValidAccessToken,
  getAccessToken,
  loadSpotifySDK,
  playTrack,
} from '../services/spotify';
import type { SpotifyPlayer } from '../types';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSpotifyPlayer() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const initializePlayer = useCallback(async () => {
    try {
      await ensureValidAccessToken();
      await loadSpotifySDK();

      const player = new window.Spotify.Player({
        name: 'Voice Music Player',
        getOAuthToken: (cb) => {
          const current = getAccessToken();
          if (current) {
            cb(current);
            return;
          }
          void ensureValidAccessToken()
            .then(cb)
            .catch(() => cb(''));
        },
        volume: 1,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
        setPlayerError(null);
      });

      player.addListener('not_ready', () => {
        deviceIdRef.current = null;
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

      player.addListener('player_state_changed', (state: { paused?: boolean } | null) => {
        if (!state) {
          setIsPaused(true);
          return;
        }
        setIsPaused(Boolean(state.paused));
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

  const waitForDevice = useCallback(async () => {
    const started = Date.now();
    while (!deviceIdRef.current) {
      if (Date.now() - started > 10000) {
        throw new Error('Spotify 플레이어가 준비되지 않았습니다. Premium 계정과 브라우저 재생 권한을 확인해 주세요.');
      }
      await sleep(250);
    }
    return deviceIdRef.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      await playerRef.current?.activateElement?.();
      await playerRef.current?.setVolume(1);
    } catch {
      // Click-to-unlock can fail before the SDK is ready; playback still retries later.
    }
  }, []);

  const play = useCallback(async (trackUri: string) => {
    await unlockAudio();
    const readyDeviceId = await waitForDevice();
    await playTrack(trackUri, readyDeviceId);
    await sleep(300);
    try {
      await playerRef.current?.resume();
      setIsPaused(false);
    } catch {
      // Already playing is fine.
    }
  }, [unlockAudio, waitForDevice]);

  const pause = useCallback(async () => {
    await playerRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(async () => {
    await unlockAudio();
    await playerRef.current?.resume();
    setIsPaused(false);
  }, [unlockAudio]);

  const togglePause = useCallback(async () => {
    if (isPaused) {
      await resume();
      return;
    }
    await pause();
  }, [isPaused, pause, resume]);

  return {
    deviceId,
    isReady,
    isPaused,
    playerError,
    play,
    pause,
    resume,
    togglePause,
    unlockAudio,
  };
}
