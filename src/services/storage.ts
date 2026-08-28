import type {
  LastPlayedSong,
  PlayedSong,
  PlayedSongStat,
  RecommendationSet,
  RecommendedTrack,
} from '../types';

const LAST_PLAYED_KEY = 'lastPlayedSong';
const PLAY_HISTORY_KEY = 'playedSongs';
const RECOMMENDATION_SETS_KEY = 'recommendationSets';
const MAX_HISTORY = 50;
const MAX_RECOMMENDATION_SETS = 20;

export function getLastPlayedSong(): LastPlayedSong | null {
  const history = getPlayedSongs();
  if (history[0]) {
    return history[0];
  }
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastPlayedSong;
  } catch {
    return null;
  }
}

export function getPlayedSongs(): PlayedSong[] {
  try {
    const raw = localStorage.getItem(PLAY_HISTORY_KEY);
    if (!raw) {
      const last = getLegacyLastPlayed();
      return last ? [last] : [];
    }
    const parsed = JSON.parse(raw) as PlayedSong[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getLegacyLastPlayed(): PlayedSong | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    if (!raw) return null;
    const song = JSON.parse(raw) as LastPlayedSong;
    return {
      id: `${song.title}-${song.artist}-${song.playedAt}`,
      title: song.title,
      artist: song.artist,
      playedAt: song.playedAt,
    };
  } catch {
    return null;
  }
}

export function addPlayedSong(song: Omit<PlayedSong, 'playedAt'> & { playedAt?: string }): PlayedSong[] {
  const entry: PlayedSong = {
    ...song,
    playedAt: song.playedAt ?? new Date().toISOString(),
  };
  const history = [entry, ...getPlayedSongs()].slice(0, MAX_HISTORY);
  localStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(history));
  localStorage.setItem(
    LAST_PLAYED_KEY,
    JSON.stringify({
      title: entry.title,
      artist: entry.artist,
      playedAt: entry.playedAt,
    }),
  );
  return history;
}

export function clearPlayedSongs(): void {
  localStorage.removeItem(PLAY_HISTORY_KEY);
  localStorage.removeItem(LAST_PLAYED_KEY);
}

export function getRecommendationSets(): RecommendationSet[] {
  try {
    const raw = localStorage.getItem(RECOMMENDATION_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecommendationSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecommendationSet(set: RecommendationSet): RecommendationSet[] {
  const sets = [set, ...getRecommendationSets()].slice(0, MAX_RECOMMENDATION_SETS);
  localStorage.setItem(RECOMMENDATION_SETS_KEY, JSON.stringify(sets));
  return sets;
}

export function clearRecommendationSets(): void {
  localStorage.removeItem(RECOMMENDATION_SETS_KEY);
}

function songKey(song: { id?: string; title: string; artist: string }): string {
  if (song.id && /^[A-Za-z0-9]{22}$/.test(song.id)) {
    return `id:${song.id}`;
  }
  return `name:${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`;
}

export function getPreviouslyRecommendedTracks(
  sets: RecommendationSet[] = getRecommendationSets(),
): RecommendedTrack[] {
  const unique = new Map<string, RecommendedTrack>();
  for (const set of sets) {
    for (const track of set.tracks) {
      const key = songKey(track);
      if (!unique.has(key)) {
        unique.set(key, track);
      }
    }
  }
  return [...unique.values()];
}

export function getMostPlayedSong(played: PlayedSong[] = getPlayedSongs()): PlayedSong | null {
  return getPlayedSongStats(played)[0]?.song ?? null;
}

export function getPlayedSongStats(played: PlayedSong[] = getPlayedSongs()): PlayedSongStat[] {
  const counts = new Map<string, PlayedSongStat>();
  for (const song of played) {
    const key = songKey(song);
    const existing = counts.get(key);
    if (existing) {
      existing.playCount += 1;
      if (!existing.song.albumImage && song.albumImage) {
        existing.song = { ...existing.song, albumImage: song.albumImage };
      }
    } else {
      counts.set(key, { song, playCount: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => {
    if (b.playCount !== a.playCount) {
      return b.playCount - a.playCount;
    }
    return new Date(b.song.playedAt).getTime() - new Date(a.song.playedAt).getTime();
  });
}
