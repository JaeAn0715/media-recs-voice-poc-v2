import type { ExtractedSong } from '../types';
import { getOpenAIApiKey } from './credentials';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function extractSongFromUtterance(utterance: string): Promise<ExtractedSong> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API Key가 없습니다. 화면에 입력한 뒤 저장해 주세요.');
  }

  const response = await fetch(OPENAI_API_URL, {
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API 오류: ${error}`);
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
