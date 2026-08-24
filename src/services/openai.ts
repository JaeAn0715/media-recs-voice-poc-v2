import type { ExtractedSong } from '../types';
import { getOpenAIApiKey } from './credentials';
import { fetchWithTimeout, readApiError } from './http';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function extractSongFromUtterance(utterance: string): Promise<ExtractedSong> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API Key가 없습니다. 화면에 입력한 뒤 저장해 주세요.');
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
    throw new Error(`OpenAI API 오류: ${await readApiError(response)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('ChatGPT에서 노래 정보를 추출하지 못했습니다.');
  }

  const parsed = JSON.parse(content) as ExtractedSong;
  if (!parsed.title?.trim()) {
    throw new Error('음성에서 노래 제목을 찾을 수 없습니다. 다시 말씀해 주세요.');
  }

  return {
    title: parsed.title.trim(),
    artist: parsed.artist?.trim() || undefined,
  };
}

export async function recommendSongsFromHistory(
  played: { title: string; artist: string }[],
): Promise<{ title: string; artist: string; reason?: string }[]> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API Key가 없습니다. 화면에 입력한 뒤 저장해 주세요.');
  }
  if (played.length === 0) {
    throw new Error('추천하려면 먼저 노래를 재생해 주세요.');
  }

  const history = played
    .slice(0, 30)
    .map((song, index) => `${index + 1}. ${song.title} - ${song.artist}`)
    .join('\n');

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
            content: `당신은 음악 추천 전문가입니다. 사용자가 지금까지 들은 곡을 보고 좋아할 만한 노래 12곡을 추천하세요.
이미 들은 곡은 제외하세요. Spotify에서 검색 가능한, 실제로 발매된 곡만 추천하세요.
제목과 아티스트는 Spotify 검색에 잘 맞는 공식 표기를 쓰세요.
반드시 JSON만 응답하세요:
{"songs":[{"title":"...","artist":"...","reason":"..."}]}`,
          },
          {
            role: 'user',
            content: `이 사람이 지금까지 재생한 노래입니다.\n${history}\n\n이 사람이 좋아할 만한 노래 12곡을 추천해 주세요. 검색이 잘 되는 실제 곡만 골라 주세요.`,
          },
        ],
      }),
    },
    'ChatGPT 추천',
    30000,
  );

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${await readApiError(response)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('ChatGPT에서 추천 결과를 받지 못했습니다.');
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
    throw new Error('추천할 노래를 만들지 못했습니다.');
  }

  return songs.slice(0, 12);
}
