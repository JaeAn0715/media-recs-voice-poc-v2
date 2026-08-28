import { t } from '../i18n';
import type { PlayedSong, RecommendationSet } from '../types';
import { recommendSimilarSongs } from './openai';
import { resolveRecommendedTracks } from './spotify';
import {
  getMostPlayedSong,
  getPreviouslyRecommendedTracks,
  getRecommendationSets,
  saveRecommendationSet,
} from './storage';

export async function createRecommendationSet(
  played: PlayedSong[],
  onProgress?: (message: string) => void,
): Promise<RecommendationSet> {
  const seed = getMostPlayedSong(played);
  if (!seed) {
    throw new Error(t('needPlayHistory'));
  }

  const previousRecommendations = getPreviouslyRecommendedTracks(getRecommendationSets());
  const excludedSongs = [
    ...played.map((song) => ({ title: song.title, artist: song.artist })),
    ...previousRecommendations.map((track) => ({
      title: track.title,
      artist: track.artist,
    })),
  ];

  onProgress?.(t('llmRecommendProgress'));
  const suggestions = await recommendSimilarSongs(
    { title: seed.title, artist: seed.artist },
    excludedSongs,
  );

  const excludedNames = new Set(
    excludedSongs.map(
      (song) => `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`,
    ),
  );
  const filteredSuggestions = suggestions.filter(
    (song) =>
      !excludedNames.has(
        `${song.title.trim().toLowerCase()}::${song.artist.trim().toLowerCase()}`,
      ),
  );
  const excludeIds = new Set([
    ...played.map((song) => song.id).filter(Boolean),
    ...previousRecommendations.map((track) => track.id).filter(Boolean),
  ]);
  onProgress?.(t('spotifySearchProgress', { done: 0, total: filteredSuggestions.length }));
  const tracks = await resolveRecommendedTracks(filteredSuggestions, excludeIds, (done, total) => {
    onProgress?.(t('spotifySearchProgress', { done, total }));
  });

  if (tracks.length === 0) {
    throw new Error(t('noRecommendResults'));
  }

  const set: RecommendationSet = {
    id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    basedOn: [{ title: seed.title, artist: seed.artist }],
    tracks,
  };

  saveRecommendationSet(set);
  return set;
}
