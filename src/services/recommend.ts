import type { PlayedSong, RecommendationSet } from '../types';
import { recommendSongsFromHistory } from './openai';
import { resolveRecommendedTracks } from './spotify';
import { saveRecommendationSet } from './storage';

export async function createRecommendationSet(
  played: PlayedSong[],
  onProgress?: (message: string) => void,
): Promise<RecommendationSet> {
  if (played.length === 0) {
    throw new Error('추천하려면 먼저 노래를 재생해 주세요.');
  }

  onProgress?.('지금까지 들은 곡으로 LLM 추천을 받는 중...');
  const suggestions = await recommendSongsFromHistory(
    played.map((song) => ({ title: song.title, artist: song.artist })),
  );

  const excludeIds = new Set(played.map((song) => song.id).filter(Boolean));
  onProgress?.(`Spotify Open API로 추천곡 검색 중... (0/${suggestions.length})`);
  const tracks = await resolveRecommendedTracks(suggestions, excludeIds, (done, total) => {
    onProgress?.(`Spotify Open API로 추천곡 검색 중... (${done}/${total})`);
  });

  if (tracks.length === 0) {
    throw new Error('추천곡을 Spotify에서 찾지 못했습니다. 다시 시도해 주세요.');
  }

  const set: RecommendationSet = {
    id: `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    basedOn: played.slice(0, 20).map((song) => ({
      title: song.title,
      artist: song.artist,
    })),
    tracks,
  };

  saveRecommendationSet(set);
  return set;
}
