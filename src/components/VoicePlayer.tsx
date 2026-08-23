import { useCallback, useEffect, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { extractSongFromUtterance } from '../services/openai';
import { searchTrack } from '../services/spotify';
import { getLastPlayedSong, saveLastPlayedSong } from '../services/storage';
import type { LastPlayedSong, SpotifyTrack } from '../types';

type Status = 'idle' | 'processing' | 'playing' | 'error';

export function VoicePlayer() {
  const {
    isSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    clearTranscript,
    clearError: clearSpeechError,
  } = useSpeechRecognition();

  const { isReady, playerError, play } = useSpotifyPlayer();

  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [lastPlayed, setLastPlayed] = useState<LastPlayedSong | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLastPlayed(getLastPlayedSong());
  }, []);

  const processUtterance = useCallback(
    async (text: string) => {
      setStatus('processing');
      setError(null);
      setStatusMessage('ChatGPT가 노래 제목을 분석 중...');

      try {
        const extracted = await extractSongFromUtterance(text);
        setStatusMessage(
          `"${extracted.title}"${extracted.artist ? ` - ${extracted.artist}` : ''} 검색 중...`,
        );

        const track = await searchTrack(extracted.title, extracted.artist);
        setCurrentTrack(track);

        if (!isReady) {
          throw new Error('Spotify 플레이어가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }

        setStatusMessage(`"${track.name}" 재생 중...`);
        await play(track.uri);

        const artistName = track.artists.map((a) => a.name).join(', ');
        saveLastPlayedSong(track.name, artistName);
        setLastPlayed({ title: track.name, artist: artistName, playedAt: new Date().toISOString() });

        setStatus('playing');
        setStatusMessage(`재생 중: ${track.name} - ${artistName}`);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setStatusMessage('');
      }
    },
    [isReady, play],
  );

  useEffect(() => {
    if (transcript && !isListening) {
      processUtterance(transcript);
    }
  }, [transcript, isListening, processUtterance]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      clearSpeechError();
      setError(null);
      setStatus('idle');
      setStatusMessage('');
      startListening();
    }
  };

  const displayError = error || speechError || playerError;

  return (
    <div className="voice-player">
      <header className="header">
        <h1>Voice Music Player</h1>
        <p className="subtitle">음성으로 노래를 요청하면 Spotify에서 재생합니다</p>
      </header>

      <div className="mic-section">
        <button
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={handleMicClick}
          disabled={!isSupported || !isReady || status === 'processing'}
          aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
        >
          <span className="mic-icon">{isListening ? '⏹' : '🎤'}</span>
        </button>
        <p className="mic-hint">
          {!isSupported
            ? '이 브라우저는 음성 인식을 지원하지 않습니다.'
            : !isReady
              ? 'Spotify 플레이어 연결 중...'
              : isListening
                ? '말씀해 주세요... (예: "아이유 좋은 날 틀어줘")'
                : status === 'processing'
                  ? statusMessage
                  : '마이크를 눌러 노래를 요청하세요'}
        </p>
      </div>

      {transcript && (
        <div className="transcript-box">
          <span className="label">인식된 음성</span>
          <p>{transcript}</p>
        </div>
      )}

      {status === 'processing' && statusMessage && (
        <div className="status-box processing">
          <div className="spinner" />
          <p>{statusMessage}</p>
        </div>
      )}

      {displayError && (
        <div className="status-box error">
          <p>{displayError}</p>
        </div>
      )}

      {currentTrack && status === 'playing' && (
        <div className="now-playing">
          {currentTrack.album.images[0] && (
            <img
              src={currentTrack.album.images[0].url}
              alt={currentTrack.album.name}
              className="album-art"
            />
          )}
          <div className="track-info">
            <p className="track-name">{currentTrack.name}</p>
            <p className="track-artist">
              {currentTrack.artists.map((a) => a.name).join(', ')}
            </p>
            <p className="track-id">Spotify ID: {currentTrack.id}</p>
          </div>
        </div>
      )}

      {lastPlayed && (
        <div className="last-played">
          <span className="label">마지막 재생</span>
          <p>
            {lastPlayed.title} — {lastPlayed.artist}
          </p>
          <span className="timestamp">
            {new Date(lastPlayed.playedAt).toLocaleString('ko-KR')}
          </span>
        </div>
      )}
    </div>
  );
}
