export type Locale = 'ko' | 'en';

const LOCALE_KEY = 'app_locale';

const ko = {
  appTitle: 'Voice Music Player',
  loginSubtitle: '음성으로 Spotify 노래를 재생하세요',
  featureVoice: '🎤 음성으로 노래 요청',
  featureGpt: '🤖 ChatGPT가 제목 추출',
  featurePlay: '🎵 Spotify에서 재생',
  redirectUriHint:
    'Spotify Dashboard → 앱 → Redirect URIs에 위 주소를 한 글자도 다르게 말고 그대로 추가하세요. `localhost`는 사용할 수 없습니다.',
  copyUri: 'URI 복사',
  copied: '복사됨',
  openDashboard: 'Dashboard 열기',
  loginButton: 'Spotify로 로그인',
  loggingIn: 'Spotify로 이동 중...',
  premiumNote: '* Spotify Premium 계정이 필요합니다',
  loginFailed: 'Spotify 로그인을 시작하지 못했습니다.',
  clientIdPlaceholder: 'Spotify Developer Dashboard의 Client ID',
  clientIdLink: 'Client ID 확인하기',
  clientSecretHint:
    'Client Secret(Key)는 넣지 마세요. 브라우저 앱은 Spotify PKCE라 Client ID만 사용하고, 로그인 후 Access Token이 Open API 키 역할을 합니다.',
  openaiKeyLink: 'API Key 확인하기',
  keysStoredHint: '입력한 키는 이 브라우저의 localStorage에만 저장됩니다.',
  subtitle: '음성으로 노래를 요청하면 Spotify에서 재생합니다',
  micStop: '음성 인식 중지',
  micStart: '음성 인식 시작',
  micUnsupported: '이 브라우저는 음성 인식을 지원하지 않습니다. 아래 텍스트로 요청하세요.',
  listening: '듣고 있습니다... (예: "아이유 좋은 날 틀어줘")',
  processing: '요청을 처리하는 중입니다...',
  tapMic: '마이크를 눌러 노래를 요청하세요',
  textCommandLabel: '텍스트로도 같은 흐름을 실행할 수 있습니다',
  textPlaceholder: '예: 아이유 좋은 날 재생해줘',
  run: '실행',
  play: '재생',
  pause: '멈춤',
  apiKeys: 'API 키 설정',
  saveKeys: '브라우저에 키 저장',
  keysSaved: '이 브라우저에 저장했습니다.',
  saveKeysFailed: '키 저장에 실패했습니다.',
  playedSongs: '재생한 노래',
  noPlayedSongs: '아직 재생한 노래가 없습니다.',
  playCountOne: '1회 재생',
  playCount: '{count}회 재생',
  clearPlayedSongs: '재생한 노래 전부 지우기',
  clearPlayedSongsConfirm: '재생한 노래를 모두 지울까요?',
  playerConnecting: 'Spotify 플레이어 연결 중... 검색은 바로 진행됩니다.',
  unknownError: '알 수 없는 오류가 발생했습니다.',
  playFailed: '재생에 실패했습니다.',
  missingUri: '이 항목에는 재생할 Spotify URI가 없습니다. 다시 검색해 주세요.',
  logVoice: '음성',
  logPlay: '재생',
  logError: '오류',
  utteranceReceived: '"{command}"가 입력되었습니다.',
  filteringTitle: '발화에서 검색할 노래 제목을 필터링하는 중...',
  filteredTitle: 'ChatGPT가 검색할 곡을 {query}(으)로 필터링했습니다.',
  filteredTitleFallback: 'ChatGPT가 제목을 확정하지 못해 입력한 {query}(으)로 바로 검색합니다.',
  searchingSpotify: 'Spotify Open API로 {query} 검색 중...',
  searchResult: '검색 결과: "{name}" — {artist} (id: {id})',
  startingPlay: '"{name}"을(를) 재생합니다.',
  startedPlay: '"{name}" — {artist} 재생을 시작했습니다.',
  recommendButton: 'LLM으로 추천받기',
  recommending: '추천 중...',
  recentRecommendations: '최근 추천목록',
  preparingRecommend: '추천을 준비하는 중...',
  llmRecommendProgress: '가장 많이 재생한 곡과 비슷한 노래를 LLM에 요청하는 중...',
  spotifySearchProgress: 'Spotify Open API로 추천곡 검색 중... ({done}/{total})',
  foundPlayable: 'Spotify에서 재생 가능한 {count}곡을 찾았습니다.',
  recommendFailed: '추천에 실패했습니다.',
  thisRecommendation: '이번 추천',
  similarSongs: '{title}와 비슷한 노래',
  similarSongsBatchim: '{title}과 비슷한 노래',
  similarSongsEn: 'Songs similar to {title}',
  recommendEmptyHint: '가장 많이 재생한 노래와 비슷한 곡 10개를 추천받습니다.',
  noSavedRecommendations: '아직 저장된 추천 기록이 없습니다.',
  trackCount: '{count}곡',
  basedOnSong: '{title} 기준',
  authDenied: 'Spotify 인증 거부: {error}',
  noAuthCode: '인증 코드가 없습니다.',
  authFailed: '인증 처리 실패',
  goBack: '돌아가기',
  authProcessing: 'Spotify 로그인 처리 중...',
  language: '언어',
  needPlayHistory: '추천하려면 먼저 노래를 재생해 주세요.',
  noRecommendResults: '추천곡을 Spotify에서 찾지 못했습니다. 다시 시도해 주세요.',
  noOpenaiKey: 'OpenAI API Key가 없습니다. 화면에 입력한 뒤 저장해 주세요.',
  openaiError: 'OpenAI API 오류: {detail}',
  extractFailed: 'ChatGPT에서 노래 정보를 추출하지 못했습니다.',
  noTitleInSpeech: '음성에서 노래 제목을 찾을 수 없습니다. 다시 말씀해 주세요.',
  recommendEmptyLlm: '추천할 노래를 만들지 못했습니다.',
  recommendLlmFailed: 'ChatGPT에서 추천 결과를 받지 못했습니다.',
  speechNoSpeech: '음성이 들리지 않았습니다. 다시 말씀해 주세요.',
  speechNoMic: '마이크를 찾을 수 없습니다.',
  speechNotAllowed: '마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.',
  speechAborted: '음성 인식이 중단되었습니다.',
  speechNetwork: '음성 인식 네트워크 오류가 발생했습니다.',
  speechError: '음성 인식 오류: {error}',
  speechUnrecognized: '음성을 인식하지 못했습니다. 다시 말하거나 텍스트로 입력해 주세요.',
  speechRestartFailed: '음성 인식을 다시 시작할 수 없습니다. 잠시 후 다시 눌러 주세요.',
} as const;

const en: Record<keyof typeof ko, string> = {
  appTitle: 'Voice Music Player',
  loginSubtitle: 'Play Spotify songs with your voice',
  featureVoice: '🎤 Ask for a song by voice',
  featureGpt: '🤖 ChatGPT extracts the title',
  featurePlay: '🎵 Play it on Spotify',
  redirectUriHint:
    'Add this exact address to Spotify Dashboard → App → Redirect URIs. Do not use `localhost`.',
  copyUri: 'Copy URI',
  copied: 'Copied',
  openDashboard: 'Open Dashboard',
  loginButton: 'Log in with Spotify',
  loggingIn: 'Redirecting to Spotify...',
  premiumNote: '* A Spotify Premium account is required',
  loginFailed: 'Could not start Spotify login.',
  clientIdPlaceholder: 'Client ID from Spotify Developer Dashboard',
  clientIdLink: 'Find Client ID',
  clientSecretHint:
    'Do not enter a Client Secret. This browser app uses Spotify PKCE, so only the Client ID is needed. After login, the access token acts as the Open API key.',
  openaiKeyLink: 'Find API Key',
  keysStoredHint: 'Keys are stored only in this browser’s localStorage.',
  subtitle: 'Ask for a song by voice and play it on Spotify',
  micStop: 'Stop listening',
  micStart: 'Start listening',
  micUnsupported: 'This browser does not support speech recognition. Use the text box below.',
  listening: 'Listening... (e.g. "Play IU Good Day")',
  processing: 'Processing your request...',
  tapMic: 'Tap the mic and ask for a song',
  textCommandLabel: 'You can run the same flow with text',
  textPlaceholder: 'e.g. Play IU Good Day',
  run: 'Run',
  play: 'Play',
  pause: 'Pause',
  apiKeys: 'API key settings',
  saveKeys: 'Save keys in this browser',
  keysSaved: 'Saved in this browser.',
  saveKeysFailed: 'Could not save keys.',
  playedSongs: 'Played songs',
  noPlayedSongs: 'No songs played yet.',
  playCountOne: 'Played once',
  playCount: 'Played {count} times',
  clearPlayedSongs: 'Clear all played songs',
  clearPlayedSongsConfirm: 'Clear all played songs?',
  playerConnecting: 'Connecting Spotify player... Search still works.',
  unknownError: 'An unknown error occurred.',
  playFailed: 'Playback failed.',
  missingUri: 'This item has no Spotify URI. Search for it again.',
  logVoice: 'Voice',
  logPlay: 'Play',
  logError: 'Error',
  utteranceReceived: 'Heard "{command}".',
  filteringTitle: 'Filtering the song title from your request...',
  filteredTitle: 'ChatGPT filtered the search to {query}.',
  filteredTitleFallback: 'ChatGPT could not confirm the title, so searching directly for {query}.',
  searchingSpotify: 'Searching Spotify Open API for {query}...',
  searchResult: 'Result: "{name}" — {artist} (id: {id})',
  startingPlay: 'Playing "{name}".',
  startedPlay: 'Started playing "{name}" — {artist}.',
  recommendButton: 'Recommend with LLM',
  recommending: 'Recommending...',
  recentRecommendations: 'Recent recommendations',
  preparingRecommend: 'Preparing recommendations...',
  llmRecommendProgress: 'Asking the LLM for songs similar to your most-played track...',
  spotifySearchProgress: 'Searching Spotify Open API... ({done}/{total})',
  foundPlayable: 'Found {count} playable tracks on Spotify.',
  recommendFailed: 'Recommendation failed.',
  thisRecommendation: 'This recommendation',
  similarSongs: 'Songs similar to {title}',
  similarSongsBatchim: 'Songs similar to {title}',
  similarSongsEn: 'Songs similar to {title}',
  recommendEmptyHint: 'Get 10 songs similar to the track you play most.',
  noSavedRecommendations: 'No saved recommendations yet.',
  trackCount: '{count} tracks',
  basedOnSong: 'Based on {title}',
  authDenied: 'Spotify login denied: {error}',
  noAuthCode: 'Missing authorization code.',
  authFailed: 'Login failed',
  goBack: 'Go back',
  authProcessing: 'Finishing Spotify login...',
  language: 'Language',
  needPlayHistory: 'Play a song first to get recommendations.',
  noRecommendResults: 'Could not find recommended tracks on Spotify. Try again.',
  noOpenaiKey: 'OpenAI API Key is missing. Enter it on the screen and save.',
  openaiError: 'OpenAI API error: {detail}',
  extractFailed: 'ChatGPT could not extract song info.',
  noTitleInSpeech: 'No song title found in the request. Please try again.',
  recommendEmptyLlm: 'Could not create song recommendations.',
  recommendLlmFailed: 'ChatGPT did not return recommendations.',
  speechNoSpeech: 'No speech was heard. Please try again.',
  speechNoMic: 'Microphone not found.',
  speechNotAllowed: 'Microphone permission was denied. Allow it in browser settings.',
  speechAborted: 'Speech recognition was stopped.',
  speechNetwork: 'Speech recognition network error.',
  speechError: 'Speech recognition error: {error}',
  speechUnrecognized: 'Could not recognize speech. Try again or type the request.',
  speechRestartFailed: 'Could not restart speech recognition. Tap again in a moment.',
};

export type MessageKey = keyof typeof ko;

export function getStoredLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ko';
  } catch {
    return 'ko';
  }
}

export function saveLocale(locale: Locale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? `{${name}}` : String(vars[name]),
  );
}

export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
  locale: Locale = getStoredLocale(),
): string {
  const table = locale === 'en' ? en : ko;
  return interpolate(table[key], vars);
}

export function hasBatchim(text: string): boolean {
  const last = text.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function similarSongsHeading(title: string, locale: Locale = getStoredLocale()): string {
  if (locale === 'en') {
    return t('similarSongsEn', { title }, locale);
  }
  return t(hasBatchim(title) ? 'similarSongsBatchim' : 'similarSongs', { title }, locale);
}
