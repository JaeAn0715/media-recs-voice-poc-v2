import type { LastPlayedSong, PlayedSong } from '../types';

const LAST_PLAYED_KEY = 'lastPlayedSong';
const PLAY_HISTORY_KEY = 'playedSongs';
const MAX_HISTORY = 50;

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
