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
import { getLastPlayedSong, saveLastPlayedSong } from '../services/storage';
import type { LastPlayedSong, SpotifyTrack } from '../types';
import { CredentialsForm } from './CredentialsForm';

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

  const { isReady, playerError, play } = useSpotifyPlayer();

  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [textCommand, setTextCommand] = useState('');
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [lastPlayed, setLastPlayed] = useState<LastPlayedSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(getSpotifyClientId);
  const [openAIApiKey, setOpenAIApiKey] = useState(getOpenAIApiKey);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const processedRef = useRef('');
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLastPlayed(getLastPlayedSong());
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

      setStatus('processing');
      setError(null);
      setLogs([]);
      setCurrentTrack(null);

      const voiceLog = appendLog('음성', `"${command}"가 입력되었습니다.`, 'done');
      const gptLog = appendLog('ChatGPT', '발화에서 검색할 노래 제목을 필터링하는 중...');
      const searchLog = appendLog('Spotify Open API', '제목이 정해지면 검색을 시작합니다.');
      const playLog = appendLog('재생', '검색이 끝나면 재생을 시작합니다.');

      try {
        const extracted = await extractSongFromUtterance(command);
        const queryLabel = extracted.artist
          ? `"${extracted.title}" - ${extracted.artist}`
          : `"${extracted.title}"`;
        updateLog(
          gptLog,
          `ChatGPT가 검색할 곡을 ${queryLabel}(으)로 필터링했습니다.`,
          'done',
        );
        updateLog(searchLog, `Spotify Open API로 ${queryLabel} 검색 중...`, 'running');

        const track = await searchTrack(extracted.title, extracted.artist);
        const artistName = track.artists.map((artist) => artist.name).join(', ');
        setCurrentTrack(track);
        updateLog(
          searchLog,
          `검색 결과: "${track.name}" — ${artistName} (id: ${track.id})`,
          'done',
        );
        updateLog(playLog, `"${track.name}"을(를) 재생합니다.`, 'running');

        await play(track.uri);

        saveLastPlayedSong(track.name, artistName);
        setLastPlayed({
          title: track.name,
          artist: artistName,
          playedAt: new Date().toISOString(),
        });
        updateLog(playLog, `"${track.name}" — ${artistName} 재생을 시작했습니다.`, 'done');
        updateLog(voiceLog, `"${command}" 요청을 처리했습니다.`, 'done');
        setStatus('playing');
      } catch (err) {
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
    clearTranscript();
    clearSpeechError();
    setError(null);
    setStatus('idle');
    setLogs((current) =>
      current.length
        ? current
        : [{ id: 0, step: '대기', text: '마이크가 열렸습니다. 노래를 말씀해 주세요.', state: 'running' }],
    );
    startListening();
  };

  const handleTextSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = textCommand.trim();
    if (!command || status === 'processing') {
      return;
    }
    processedRef.current = command;
    void processUtterance(command);
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
              {currentTrack.artists.map((artist) => artist.name).join(', ')}
            </p>
            <p className="track-id">Spotify ID: {currentTrack.id}</p>
          </div>
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

      {!isReady && (
        <p className="player-ready-hint">Spotify 플레이어 연결 중... 검색은 바로 진행됩니다.</p>
      )}
    </div>
  );
}
