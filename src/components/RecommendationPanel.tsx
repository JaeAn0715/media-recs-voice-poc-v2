import { useState } from 'react';
import { createRecommendationSet } from '../services/recommend';
import { getRecommendationSets } from '../services/storage';
import type { PlayedSong, RecommendationSet, RecommendedTrack } from '../types';

type PanelView = 'latest' | 'history';

interface RecommendationPanelProps {
  playHistory: PlayedSong[];
  onPlayTrack: (track: RecommendedTrack) => void | Promise<void>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR');
}

function TrackList({
  tracks,
  onPlayTrack,
}: {
  tracks: RecommendedTrack[];
  onPlayTrack: (track: RecommendedTrack) => void | Promise<void>;
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
            <div>
              <p className="history-title">
                {index + 1}. {track.title}
              </p>
              <p className="history-artist">{track.artist}</p>
              {track.reason && <p className="recommend-reason">{track.reason}</p>}
            </div>
            <span className="history-play-label">재생</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function RecommendationPanel({ playHistory, onPlayTrack }: RecommendationPanelProps) {
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
    setProgress('추천을 준비하는 중...');
    try {
      const created = await createRecommendationSet(playHistory, setProgress);
      setSets(getRecommendationSets());
      setProgress(`Spotify에서 재생 가능한 ${created.tracks.length}곡을 찾았습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '추천에 실패했습니다.');
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
          {isLoading ? '추천 중...' : 'LLM으로 추천받기'}
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
          최근 추천목록
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
          <span className="label">이번 추천</span>
          <p className="recommend-meta">
            {formatTime(latest.createdAt)} · {latest.tracks.length}곡
          </p>
          <TrackList tracks={latest.tracks} onPlayTrack={onPlayTrack} />
        </div>
      )}

      {view === 'latest' && !isLoading && !latest && !error && (
        <p className="play-history-empty">
          재생한 노래를 바탕으로 좋아할 만한 곡 10개를 추천받습니다.
        </p>
      )}

      {view === 'history' && (
        <div className="recommend-history">
          <span className="label">최근 추천목록</span>
          {sets.length === 0 ? (
            <p className="play-history-empty">아직 저장된 추천 기록이 없습니다.</p>
          ) : (
            sets.map((set) => (
              <article key={set.id} className="recommend-set">
                <p className="recommend-meta">
                  {formatTime(set.createdAt)} · {set.tracks.length}곡
                  {set.basedOn.length > 0
                    ? ` · ${set.basedOn[0].title} 등 ${set.basedOn.length}곡 기반`
                    : ''}
                </p>
                <TrackList tracks={set.tracks} onPlayTrack={onPlayTrack} />
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
