export interface InputSongCandidate {
  title: string;
  source: 'input-fallback';
}

const GENERIC_REQUESTS = new Set([
  '노래',
  '음악',
  '재생',
  '틀어',
  '틀어줘',
  '재생해줘',
  'play',
  'song',
  'music',
]);

export function inferSongFromUtterance(utterance: string): InputSongCandidate | null {
  const candidate = utterance
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/^(?:please\s+)?(?:play|listen\s+to)\s+/i, '')
    .replace(/^(?:노래|음악)\s+/u, '')
    .replace(
      /\s*(?:노래\s*)?(?:틀어\s*줘|틀어줘|틀어|재생해\s*줘|재생해줘|재생|들려\s*줘|들려줘|듣고\s*싶어)(?:요)?[.!?~]*$/u,
      '',
    )
    .replace(/\s+(?:please|for me)[.!?]*$/i, '')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();

  if (!candidate || GENERIC_REQUESTS.has(candidate.toLowerCase())) {
    return null;
  }

  return { title: candidate, source: 'input-fallback' };
}
