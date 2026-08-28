import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocale } from '../context/LocaleContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { extractSongFromUtterance } from '../services/openai';
import { searchTrack } from '../services/spotify';
import {
  getOpenAIApiKey,
  getSpotifyClientId,
  saveBrowserCredentials,
} from '../services/credentials';
import {
  addPlayedSong,
  clearPlayedSongs,
  getPlayedSongs,
  getPlayedSongStats,
} from '../services/storage';
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
  const { locale, t } = useLocale();
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
  } = useSpeechRecognition(locale);

  const { isReady, isPaused, playerError, play, togglePause, unlockAudio } = useSpotifyPlayer();

  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [textCommand, setTextCommand] = useState('');
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [playHistory, setPlayHistory] = useState<PlayedSong[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(getSpotifyClientId);
  const [openAIApiKey, setOpenAIApiKey] = useState(getOpenAIApiKey);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const processedRef = useRef('');
  const logIdRef = useRef(0);
  const runIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const playedSongStats = useMemo(() => getPlayedSongStats(playHistory), [playHistory]);

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

      appendLog(t('logVoice'), t('utteranceReceived', { command }), 'done');
      const gptLog = appendLog('ChatGPT', t('filteringTitle'));

      try {
        const extracted = await extractSongFromUtterance(command);
        if (!stillCurrent()) return;
        const queryLabel = extracted.artist
          ? `"${extracted.title}" - ${extracted.artist}`
          : `"${extracted.title}"`;
        updateLog(
          gptLog,
          t(
            extracted.source === 'input-fallback'
              ? 'filteredTitleFallback'
              : 'filteredTitle',
            { query: queryLabel },
          ),
          'done',
        );

        const searchLog = appendLog(
          'Spotify Open API',
          t('searchingSpotify', { query: queryLabel }),
        );
        const track = await searchTrack(extracted.title, extracted.artist);
        if (!stillCurrent()) return;
        const artistName = track.artists.map((artist) => artist.name).join(', ');
        setCurrentTrack(track);
        updateLog(
          searchLog,
          t('searchResult', { name: track.name, artist: artistName, id: track.id }),
          'done',
        );

        const playLog = appendLog(t('logPlay'), t('startingPlay', { name: track.name }));

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
        updateLog(playLog, t('startedPlay', { name: track.name, artist: artistName }), 'done');
        setStatus('playing');
      } catch (err) {
        if (!stillCurrent()) return;
        const message = err instanceof Error ? err.message : t('unknownError');
        setStatus('error');
        setError(message);
        setLogs((current) => {
          const running = [...current].reverse().find((entry) => entry.state === 'running');
          if (!running) {
            logIdRef.current += 1;
            return [...current, { id: logIdRef.current, step: t('logError'), text: message, state: 'error' }];
          }
          return current.map((entry) =>
            entry.id === running.id ? { ...entry, text: message, state: 'error' as const } : entry,
          );
        });
      }
    },
    [appendLog, play, t, updateLog],
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
      setError(t('missingUri'));
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
      setError(err instanceof Error ? err.message : t('playFailed'));
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
      setError(err instanceof Error ? err.message : t('playFailed'));
    }
  };

  const displayError = error || speechError || playerError;

  return (
    <div className="voice-player">
      <header className="header">
        <h1>{t('appTitle')}</h1>
        <p className="subtitle">{t('subtitle')}</p>
      </header>

      <div className="mic-section">
        <button
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={handleMicClick}
          disabled={!isSupported || status === 'processing'}
          aria-label={isListening ? t('micStop') : t('micStart')}
        >
          <span className="mic-icon">{isListening ? '⏹' : '🎤'}</span>
        </button>
        <p className="mic-hint">
          {!isSupported
            ? t('micUnsupported')
            : isListening
              ? interimTranscript || t('listening')
              : status === 'processing'
                ? t('processing')
                : t('tapMic')}
        </p>
      </div>

      <form className="text-command" onSubmit={handleTextSubmit}>
        <label htmlFor="text-command">{t('textCommandLabel')}</label>
        <div className="text-command-row">
          <input
            id="text-command"
            value={textCommand}
            onChange={(event) => setTextCommand(event.target.value)}
            placeholder={t('textPlaceholder')}
            disabled={status === 'processing'}
          />
          <button type="submit" disabled={status === 'processing' || !textCommand.trim()}>
            {t('run')}
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
            aria-label={isPaused ? t('play') : t('pause')}
          >
            {isPaused ? t('play') : t('pause')}
          </button>
        </div>
      )}

      <details className="credentials-panel">
        <summary>{t('apiKeys')}</summary>
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
              setError(err instanceof Error ? err.message : t('saveKeysFailed'));
            }
          }}
        >
          {t('saveKeys')}
        </button>
        {credentialsSaved && <p className="credentials-saved">{t('keysSaved')}</p>}
      </details>

      <details
        className="play-history"
        open={historyOpen}
        onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
      >
        <summary className="play-history-summary">
          <span className="label">{t('playedSongs')}</span>
        </summary>
        <div className="play-history-body">
          {playHistory.length === 0 ? (
            <p className="play-history-empty">{t('noPlayedSongs')}</p>
          ) : (
            <>
              <ul>
                {playedSongStats.map(({ song, playCount }) => (
                  <li key={`${song.id}-${song.title}-${song.artist}`}>
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
                          {new Date(song.playedAt).toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}
                        </span>
                        <span className="play-count">
                          {t('playCount', { count: playCount })}
                        </span>
                      </div>
                      <span className="history-play-label">{t('play')}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="clear-history-button"
                onClick={() => {
                  if (!window.confirm(t('clearPlayedSongsConfirm'))) {
                    return;
                  }
                  clearPlayedSongs();
                  setPlayHistory([]);
                }}
              >
                {t('clearPlayedSongs')}
              </button>
            </>
          )}
        </div>
      </details>

      {!isReady && (
        <p className="player-ready-hint">{t('playerConnecting')}</p>
      )}

      <RecommendationPanel playHistory={playHistory} onPlayTrack={playRecommendedTrack} />
    </div>
  );
}
