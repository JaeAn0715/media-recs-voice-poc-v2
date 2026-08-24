import { getStoredLocale, t } from '../i18n';
import type { ExtractedSong } from '../types';
import { getOpenAIApiKey } from './credentials';
import { fetchWithTimeout, readApiError } from './http';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function extractSongFromUtterance(utterance: string): Promise<ExtractedSong> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error(t('noOpenaiKey'));
  }

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
            content: `사용자의 음성 명령에서 재생할 노래 정보를 추출하세요.
예: "보헤미안 랩소디 틀어줘" → {"title": "Bohemian Rhapsody", "artist": "Queen"}
예: "아이유 좋은 날 재생해줘" → {"title": "좋은 날", "artist": "아이유"}
노래 제목이 없으면 {"title": "", "artist": ""}를 반환하세요.
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
    throw new Error(t('openaiError', { detail: await readApiError(response) }));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(t('extractFailed'));
  }

  const parsed = JSON.parse(content) as ExtractedSong;
  if (!parsed.title?.trim()) {
    throw new Error(t('noTitleInSpeech'));
  }

  return {
    title: parsed.title.trim(),
    artist: parsed.artist?.trim() || undefined,
  };
}

export async function recommendSimilarSongs(
  seed: { title: string; artist: string },
  alreadyPlayed: { title: string; artist: string }[] = [],
): Promise<{ title: string; artist: string; reason?: string }[]> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error(t('noOpenaiKey'));
  }

  const playedList = alreadyPlayed
    .slice(0, 30)
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
Exclude the seed track itself and any already-played songs. Only recommend commercially released songs that exist on Spotify.
Use official titles and artist names that search well on Spotify.
${reasonLanguage}
Reply with JSON only:
{"songs":[{"title":"...","artist":"...","reason":"..."}]}`,
          },
          {
            role: 'user',
            content: `Seed track: "${seed.title}" by ${seed.artist}

Already played songs to exclude:
${playedList || '(none)'}

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
