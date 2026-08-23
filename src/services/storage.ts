import type { LastPlayedSong } from '../types';

const LAST_PLAYED_KEY = 'lastPlayedSong';

export function getLastPlayedSong(): LastPlayedSong | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastPlayedSong;
  } catch {
    return null;
  }
}

export function saveLastPlayedSong(title: string, artist: string): void {
  const song: LastPlayedSong = {
    title,
    artist,
    playedAt: new Date().toISOString(),
  };
  localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(song));
}
