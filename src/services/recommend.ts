import { t } from '../i18n';
import type { PlayedSong, RecommendationSet } from '../types';
import { recommendSimilarSongs } from './openai';
import { resolveRecommendedTracks } from './spotify';
import { getMostPlayedSong, saveRecommendationSet } from './storage';

export async function createRecommendationSet(
  played: PlayedSong[],
  onProgress?: (message: string) => void,
): Promise<RecommendationSet> {
  const seed = getMostPlayedSong(played);
  if (!seed) {
    throw new Error(t('needPlayHistory'));
  }

  onProgress?.(t('llmRecommendProgress'));
  const suggestions = await recommendSimilarSongs(
    { title: seed.title, artist: seed.artist },
    played.map((song) => ({ title: song.title, artist: song.artist })),
  );

  const excludeIds = new Set(played.map((song) => song.id).filter(Boolean));
  onProgress?.(t('spotifySearchProgress', { done: 0, total: suggestions.length }));
  const tracks = await resolveRecommendedTracks(suggestions, excludeIds, (done, total) => {
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
