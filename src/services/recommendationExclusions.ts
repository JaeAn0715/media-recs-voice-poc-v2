import type { PlayedSong, RecommendedTrack } from '../types';

export interface ExcludedSong {
  title: string;
  artist: string;
}

function nameKey(song: ExcludedSong): string {
  return `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`;
}

export function buildExcludedSongs(
  played: PlayedSong[],
  previousRecommendations: RecommendedTrack[],
): ExcludedSong[] {
  const unique = new Map<string, ExcludedSong>();
  for (const song of [...played, ...previousRecommendations]) {
    const value = { title: song.title, artist: song.artist };
    const key = nameKey(value);
    if (!unique.has(key)) {
      unique.set(key, value);
    }
  }
  return [...unique.values()];
}

export function excludePreviouslyKnownSuggestions<T extends ExcludedSong>(
  suggestions: T[],
  excludedSongs: ExcludedSong[],
): T[] {
  const excludedNames = new Set(excludedSongs.map(nameKey));
  return suggestions.filter((song) => !excludedNames.has(nameKey(song)));
}

export function buildExcludedTrackIds(
  played: PlayedSong[],
  previousRecommendations: RecommendedTrack[],
): Set<string> {
  return new Set(
    [...played, ...previousRecommendations].map((track) => track.id).filter(Boolean),
  );
}
