import { useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { similarSongsHeading } from '../i18n';
import { createRecommendationSet } from '../services/recommend';
import { getRecommendationSets } from '../services/storage';
import type { PlayedSong, RecommendationSet, RecommendedTrack } from '../types';

type PanelView = 'latest' | 'history';

interface RecommendationPanelProps {
  playHistory: PlayedSong[];
  onPlayTrack: (track: RecommendedTrack) => void | Promise<void>;
}

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');
}

function TrackList({
  tracks,
  onPlayTrack,
  playLabel,
}: {
  tracks: RecommendedTrack[];
  onPlayTrack: (track: RecommendedTrack) => void | Promise<void>;
  playLabel: string;
}) {
  return (
    <ol className="recommend-track-list">
      {tracks.map((track, index) => (
        <li key={`${track.id}-${index}`}>
          <a
            className="recommend-track-link"
            href={track.spotifyUrl}
            onClick={(event) => {
              event.preventDefault();
              void onPlayTrack(track);
            }}
          >
            {track.albumImage && (
              <img src={track.albumImage} alt="" className="history-art" />
            )}
            <div className="recommend-track-copy">
              <p className="history-title">
                {index + 1}. {track.title}
              </p>
              <p className="history-artist">{track.artist}</p>
              {track.reason && <p className="recommend-reason">{track.reason}</p>}
            </div>
            <span className="history-play-label">{playLabel}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function setHeading(set: RecommendationSet, locale: 'ko' | 'en', fallback: string) {
  const seedTitle = set.basedOn[0]?.title;
  return seedTitle ? similarSongsHeading(seedTitle, locale) : fallback;
}

export function RecommendationPanel({ playHistory, onPlayTrack }: RecommendationPanelProps) {
  const { locale, t } = useLocale();
  const [sets, setSets] = useState<RecommendationSet[]>(() => getRecommendationSets());
  const [view, setView] = useState<PanelView>('latest');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = sets[0] ?? null;

  const handleRecommend = async () => {
    if (isLoading) {
      return;
    }
    setError(null);
    setIsLoading(true);
    setView('latest');
    setProgress(t('preparingRecommend'));
    try {
      const created = await createRecommendationSet(playHistory, setProgress);
      setSets(getRecommendationSets());
      setProgress(t('foundPlayable', { count: created.tracks.length }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('recommendFailed'));
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="recommend-panel">
      <div className="recommend-actions">
        <button
          type="button"
          className="recommend-primary"
          onClick={() => void handleRecommend()}
          disabled={isLoading}
        >
          {isLoading ? t('recommending') : t('recommendButton')}
        </button>
        <button
          type="button"
          className={`recommend-secondary ${view === 'history' ? 'active' : ''}`}
          onClick={() => {
            setSets(getRecommendationSets());
            setView('history');
            setError(null);
          }}
        >
          {t('recentRecommendations')}
        </button>
      </div>

      {isLoading && progress && (
        <p className="recommend-progress">
          <span className="mini-spinner inline" />
          {progress}
        </p>
      )}

      {error && <p className="recommend-error">{error}</p>}

      {view === 'latest' && !isLoading && latest && (
        <div className="recommend-set">
          <h2 className="recommend-heading">
            {setHeading(latest, locale, t('thisRecommendation'))}
          </h2>
          <p className="recommend-meta">
            {formatTime(latest.createdAt, locale)} · {t('trackCount', { count: latest.tracks.length })}
          </p>
          <TrackList tracks={latest.tracks} onPlayTrack={onPlayTrack} playLabel={t('play')} />
        </div>
      )}

      {view === 'latest' && !isLoading && !latest && !error && (
        <p className="play-history-empty">{t('recommendEmptyHint')}</p>
      )}

      {view === 'history' && (
        <div className="recommend-history">
          <span className="label">{t('recentRecommendations')}</span>
          {sets.length === 0 ? (
            <p className="play-history-empty">{t('noSavedRecommendations')}</p>
          ) : (
            sets.map((set) => (
              <article key={set.id} className="recommend-set">
                <h2 className="recommend-heading">
                  {setHeading(set, locale, t('thisRecommendation'))}
                </h2>
                <p className="recommend-meta">
                  {formatTime(set.createdAt, locale)} · {t('trackCount', { count: set.tracks.length })}
                  {set.basedOn[0]?.title ? ` · ${t('basedOnSong', { title: set.basedOn[0].title })}` : ''}
                </p>
                <TrackList tracks={set.tracks} onPlayTrack={onPlayTrack} playLabel={t('play')} />
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
