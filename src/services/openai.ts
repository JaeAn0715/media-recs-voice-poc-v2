import { getStoredLocale, t } from '../i18n';
import type { ExtractedSong } from '../types';
import { getOpenAIApiKey } from './credentials';
import { fetchWithTimeout, readApiError } from './http';
import { inferSongFromUtterance } from './songQuery';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function extractSongFromUtterance(utterance: string): Promise<ExtractedSong> {
  const fallback = inferSongFromUtterance(utterance);
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    if (fallback) return fallback;
    throw new Error(t('noOpenaiKey'));
  }

  try {
    const response = await fetchWithTimeout(
      OPENAI_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `당신은 음성 인식 결과를 음악 검색어로 보정하는 전문가입니다.
입력은 (1) 곡명, (2) 곡명과 아티스트명, (3) 아티스트명 중 하나입니다.

해야 할 일:
- 음성 인식의 동음이의어, 띄어쓰기, 발음 전사, 한글/영문 표기 오류를 보정하세요.
- 보정 결과가 최대한 실제로 존재하는 곡의 공식 제목이나 가수의 공식 활동명과 일치하게 하세요.
- 곡명과 아티스트가 함께 들어오면 둘을 정확히 분리하세요.
- 곡명만 들어오면 artist는 빈 문자열로, 아티스트명만 들어오면 title은 빈 문자열로 반환하세요.
- 확실하지 않아도 가장 가능성 높은 실제 음악 검색어를 선택하되, 입력과 무관한 곡이나 가수를 만들지 마세요.
- "틀어줘", "재생해줘" 같은 재생 명령은 결과에서 제거하세요.

예: "보헤미안 랩소디 퀸" → {"title": "Bohemian Rhapsody", "artist": "Queen"}
예: "아이유 좋은날" → {"title": "좋은 날", "artist": "아이유"}
예: "러브어택 리센느" → {"title": "LOVE ATTACK", "artist": "RESCENE"}
예: "테일러 스위프트" → {"title": "", "artist": "Taylor Swift"}
예: "브루노 막스" → {"title": "", "artist": "Bruno Mars"}
예: "러브어택" → {"title": "LOVE ATTACK", "artist": ""}

검색할 곡명과 아티스트명이 모두 없을 때만 {"title": "", "artist": ""}를 반환하세요.
반드시 JSON 형식으로만 응답하세요: {"title": "...", "artist": "..."}`,
            },
            {
              role: 'user',
              content: utterance,
            },
          ],
        }),
      },
      'ChatGPT',
    );

    if (!response.ok) {
      if (fallback) return fallback;
      throw new Error(t('openaiError', { detail: await readApiError(response) }));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      if (fallback) return fallback;
      throw new Error(t('extractFailed'));
    }

    const parsed = JSON.parse(content) as ExtractedSong;
    const title = parsed.title?.trim() || undefined;
    const artist = parsed.artist?.trim() || undefined;
    if (!title && !artist) {
      if (fallback) return fallback;
      throw new Error(t('noMusicSearchValue'));
    }

    return {
      title,
      artist,
      source: 'llm',
    };
  } catch (error) {
    if (fallback) return fallback;
    throw error;
  }
}

export async function recommendSimilarSongs(
  seed: { title: string; artist: string },
  excludedSongs: { title: string; artist: string }[] = [],
): Promise<{ title: string; artist: string; reason?: string }[]> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error(t('noOpenaiKey'));
  }

  const excludedList = excludedSongs
    .filter(
      (song, index, songs) =>
        songs.findIndex(
          (other) =>
            other.title.trim().toLowerCase() === song.title.trim().toLowerCase() &&
            other.artist.trim().toLowerCase() === song.artist.trim().toLowerCase(),
        ) === index,
    )
    .slice(0, 250)
    .map((song, index) => `${index + 1}. ${song.title} - ${song.artist}`)
    .join('\n');
  const reasonLanguage =
    getStoredLocale() === 'en'
      ? 'Write each reason in English, one short sentence.'
      : '각 reason은 한국어 한 문장으로 쓰세요.';

  const response = await fetchWithTimeout(
    OPENAI_API_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a music recommendation expert. Recommend 12 real songs similar to ONE seed track.
Exclude the seed track and every song in the exclusion list. The exclusion list contains both played songs and songs recommended in previous requests. Never recommend any of them again.
Only recommend commercially released songs that exist on Spotify.
Use official titles and artist names that search well on Spotify.
${reasonLanguage}
Reply with JSON only:
{"songs":[{"title":"...","artist":"...","reason":"..."}]}`,
          },
          {
            role: 'user',
            content: `Seed track: "${seed.title}" by ${seed.artist}

Songs to exclude (played or previously recommended):
${excludedList || '(none)'}

Recommend 12 similar songs to "${seed.title}".`,
          },
        ],
      }),
    },
    'ChatGPT 추천',
    30000,
  );

  if (!response.ok) {
    throw new Error(t('openaiError', { detail: await readApiError(response) }));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(t('recommendLlmFailed'));
  }

  const parsed = JSON.parse(content) as {
    songs?: { title?: string; artist?: string; reason?: string }[];
  };
  const songs = (parsed.songs ?? [])
    .map((song) => ({
      title: song.title?.trim() ?? '',
      artist: song.artist?.trim() ?? '',
      reason: song.reason?.trim(),
    }))
    .filter((song) => song.title);

  if (songs.length === 0) {
    throw new Error(t('recommendEmptyLlm'));
  }

  return songs.slice(0, 12);
}
