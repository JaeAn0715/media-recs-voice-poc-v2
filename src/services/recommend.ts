import { t } from '../i18n';
import type { PlayedSong, RecommendationSet } from '../types';
import { recommendSimilarSongs } from './openai';
import {
  buildExcludedSongs,
  buildExcludedTrackIds,
  excludePreviouslyKnownSuggestions,
} from './recommendationExclusions';
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
  const excludedSongs = buildExcludedSongs(played, previousRecommendations);

  onProgress?.(t('llmRecommendProgress'));
  const suggestions = await recommendSimilarSongs(
    { title: seed.title, artist: seed.artist },
    excludedSongs,
  );

  const filteredSuggestions = excludePreviouslyKnownSuggestions(
    suggestions,
    excludedSongs,
  );
  const excludeIds = buildExcludedTrackIds(played, previousRecommendations);
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
