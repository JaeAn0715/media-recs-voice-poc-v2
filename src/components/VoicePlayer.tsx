import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { extractSongFromUtterance } from '../services/openai';
import { searchTrack } from '../services/spotify';
import {
  getOpenAIApiKey,
  getSpotifyClientId,
  saveBrowserCredentials,
} from '../services/credentials';
import { addPlayedSong, getPlayedSongs } from '../services/storage';
import type { PlayedSong, RecommendedTrack, SpotifyTrack } from '../types';
import { CredentialsForm } from './CredentialsForm';
import { RecommendationPanel } from './RecommendationPanel';

type Status = 'idle' | 'processing' | 'playing' | 'error';
type LogState = 'running' | 'done' | 'error';

interface PipelineLog {
  id: number;
  step: string;
  text: string;
  state: LogState;
}

export function VoicePlayer() {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    clearTranscript,
    clearError: clearSpeechError,
  } = useSpeechRecognition();

  const { isReady, isPaused, playerError, play, togglePause, unlockAudio } = useSpotifyPlayer();

  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [textCommand, setTextCommand] = useState('');
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playHistory, setPlayHistory] = useState<PlayedSong[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(getSpotifyClientId);
  const [openAIApiKey, setOpenAIApiKey] = useState(getOpenAIApiKey);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const processedRef = useRef('');
  const logIdRef = useRef(0);
  const runIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPlayHistory(getPlayedSongs());
  }, []);

  const appendLog = useCallback((step: string, text: string, state: LogState = 'running') => {
    logIdRef.current += 1;
    const id = logIdRef.current;
    setLogs((current) => [...current, { id, step, text, state }]);
    return id;
  }, []);

  const updateLog = useCallback((id: number, text: string, state: LogState) => {
    setLogs((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, text, state } : entry)),
    );
  }, []);

  const processUtterance = useCallback(
    async (text: string) => {
      const command = text.trim();
      if (!command) {
        return;
      }

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      logIdRef.current = 0;
      setStatus('processing');
      setError(null);
      setLogs([]);
      setCurrentTrack(null);

      const stillCurrent = () => runIdRef.current === runId;

      appendLog('음성', `"${command}"가 입력되었습니다.`, 'done');
      const gptLog = appendLog('ChatGPT', '발화에서 검색할 노래 제목을 필터링하는 중...');

      try {
        const extracted = await extractSongFromUtterance(command);
        if (!stillCurrent()) return;
        const queryLabel = extracted.artist
          ? `"${extracted.title}" - ${extracted.artist}`
          : `"${extracted.title}"`;
        updateLog(
          gptLog,
          `ChatGPT가 검색할 곡을 ${queryLabel}(으)로 필터링했습니다.`,
          'done',
        );

        const searchLog = appendLog(
          'Spotify Open API',
          `Spotify Open API로 ${queryLabel} 검색 중...`,
        );
        const track = await searchTrack(extracted.title, extracted.artist);
        if (!stillCurrent()) return;
        const artistName = track.artists.map((artist) => artist.name).join(', ');
        setCurrentTrack(track);
        updateLog(
          searchLog,
          `검색 결과: "${track.name}" — ${artistName} (id: ${track.id})`,
          'done',
        );

        const playLog = appendLog('재생', `"${track.name}"을(를) 재생합니다.`);

        await play(track.uri);
        if (!stillCurrent()) return;

        setPlayHistory(
          addPlayedSong({
            id: track.id,
            uri: track.uri,
            title: track.name,
            artist: artistName,
            albumImage: track.album.images[0]?.url,
          }),
        );
        updateLog(playLog, `"${track.name}" — ${artistName} 재생을 시작했습니다.`, 'done');
        setStatus('playing');
      } catch (err) {
        if (!stillCurrent()) return;
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setStatus('error');
        setError(message);
        setLogs((current) => {
          const running = [...current].reverse().find((entry) => entry.state === 'running');
          if (!running) {
            logIdRef.current += 1;
            return [...current, { id: logIdRef.current, step: '오류', text: message, state: 'error' }];
          }
          return current.map((entry) =>
            entry.id === running.id ? { ...entry, text: message, state: 'error' as const } : entry,
          );
        });
      }
    },
    [appendLog, play, updateLog],
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

  useEffect(() => {
    if (!transcript || isListening) {
      return;
    }
    if (processedRef.current === transcript) {
      return;
    }
    processedRef.current = transcript;
    void processUtterance(transcript);
  }, [transcript, isListening, processUtterance]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    processedRef.current = '';
    runIdRef.current += 1;
    logIdRef.current = 0;
    clearTranscript();
    clearSpeechError();
    setError(null);
    setStatus('idle');
    setLogs([]);
    setCurrentTrack(null);
    void unlockAudio();
    startListening();
  };

  const handleTextSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = textCommand.trim();
    if (!command || status === 'processing') {
      return;
    }
    processedRef.current = command;
    void unlockAudio();
    void processUtterance(command);
  };

  const startPlayback = async (
    track: {
      id: string;
      title: string;
      artist: string;
      uri: string;
      albumImage?: string;
    },
    options?: { record?: boolean },
  ) => {
    setError(null);
    await play(track.uri);
    setStatus('playing');
    setCurrentTrack({
      id: track.id,
      name: track.title,
      artists: [{ name: track.artist }],
      uri: track.uri,
      album: {
        name: '',
        images: track.albumImage ? [{ url: track.albumImage }] : [],
      },
    });
    if (options?.record) {
      setPlayHistory(
        addPlayedSong({
          id: track.id,
          uri: track.uri,
          title: track.title,
          artist: track.artist,
          albumImage: track.albumImage,
        }),
      );
    }
  };

  const playHistoryTrack = async (song: PlayedSong) => {
    const uri = song.uri || (/^[A-Za-z0-9]{22}$/.test(song.id) ? `spotify:track:${song.id}` : '');
    if (!uri) {
      setError('이 항목에는 재생할 Spotify URI가 없습니다. 다시 검색해 주세요.');
      return;
    }
    try {
      await startPlayback({
        id: song.id,
        title: song.title,
        artist: song.artist,
        uri,
        albumImage: song.albumImage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '재생에 실패했습니다.');
    }
  };

  const playRecommendedTrack = async (track: RecommendedTrack) => {
    try {
      await startPlayback(
        {
          id: track.id,
          title: track.title,
          artist: track.artist,
          uri: track.uri,
          albumImage: track.albumImage,
        },
        { record: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '재생에 실패했습니다.');
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
          disabled={!isSupported || status === 'processing'}
          aria-label={isListening ? '음성 인식 중지' : '음성 인식 시작'}
        >
          <span className="mic-icon">{isListening ? '⏹' : '🎤'}</span>
        </button>
        <p className="mic-hint">
          {!isSupported
            ? '이 브라우저는 음성 인식을 지원하지 않습니다. 아래 텍스트로 요청하세요.'
            : isListening
              ? interimTranscript || '듣고 있습니다... (예: "아이유 좋은 날 틀어줘")'
              : status === 'processing'
                ? '요청을 처리하는 중입니다...'
                : '마이크를 눌러 노래를 요청하세요'}
        </p>
      </div>

      <form className="text-command" onSubmit={handleTextSubmit}>
        <label htmlFor="text-command">텍스트로도 같은 흐름을 실행할 수 있습니다</label>
        <div className="text-command-row">
          <input
            id="text-command"
            value={textCommand}
            onChange={(event) => setTextCommand(event.target.value)}
            placeholder='예: 아이유 좋은 날 재생해줘'
            disabled={status === 'processing'}
          />
          <button type="submit" disabled={status === 'processing' || !textCommand.trim()}>
            실행
          </button>
        </div>
      </form>

      {logs.length > 0 && (
        <ol className="pipeline-log">
          {logs.map((entry) => (
            <li key={entry.id} className={`pipeline-item ${entry.state}`}>
              <span className="pipeline-step">{entry.step}</span>
              <p>{entry.text}</p>
              {entry.state === 'running' && <span className="mini-spinner" />}
            </li>
          ))}
          <div ref={logEndRef} />
        </ol>
      )}

      {displayError && (
        <div className="status-box error">
          <p>{displayError}</p>
        </div>
      )}

      {currentTrack && (
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
              {currentTrack.artists.map((artist) => artist.name).join(', ')}
            </p>
            <p className="track-id">Spotify ID: {currentTrack.id}</p>
          </div>
          <button
            type="button"
            className="playback-toggle"
            onClick={() => void togglePause()}
            aria-label={isPaused ? '재생' : '멈춤'}
          >
            {isPaused ? '재생' : '멈춤'}
          </button>
        </div>
      )}

      <details className="credentials-panel">
        <summary>API 키 설정</summary>
        <CredentialsForm
          clientId={clientId}
          openAIApiKey={openAIApiKey}
          onClientIdChange={setClientId}
          onOpenAIApiKeyChange={setOpenAIApiKey}
        />
        <button
          className="save-keys-button"
          type="button"
          onClick={() => {
            try {
              saveBrowserCredentials(clientId, openAIApiKey);
              setCredentialsSaved(true);
              setError(null);
            } catch (err) {
              setCredentialsSaved(false);
              setError(err instanceof Error ? err.message : '키 저장에 실패했습니다.');
            }
          }}
        >
          브라우저에 키 저장
        </button>
        {credentialsSaved && <p className="credentials-saved">이 브라우저에 저장했습니다.</p>}
      </details>

      <section className="play-history">
        <span className="label">재생한 노래</span>
        {playHistory.length === 0 ? (
          <p className="play-history-empty">아직 재생한 노래가 없습니다.</p>
        ) : (
          <ul>
            {playHistory.map((song) => (
              <li key={`${song.id}-${song.playedAt}`}>
                <button
                  type="button"
                  className="history-play-button"
                  onClick={() => void playHistoryTrack(song)}
                >
                  {song.albumImage && (
                    <img src={song.albumImage} alt="" className="history-art" />
                  )}
                  <div>
                    <p className="history-title">{song.title}</p>
                    <p className="history-artist">{song.artist}</p>
                    <span className="timestamp">
                      {new Date(song.playedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <span className="history-play-label">재생</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isReady && (
        <p className="player-ready-hint">Spotify 플레이어 연결 중... 검색은 바로 진행됩니다.</p>
      )}

      <RecommendationPanel playHistory={playHistory} onPlayTrack={playRecommendedTrack} />
    </div>
  );
}
