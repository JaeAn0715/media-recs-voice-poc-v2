# Voice Music Player

음성으로 노래를 요청하면 ChatGPT가 제목을 추출하고, Spotify Open API로 검색·재생하는 React 앱입니다.

## 기능

- **음성 인식**: Web Speech API로 한국어 음성 명령 수신
- **ChatGPT 제목 추출**: OpenAI API가 발화에서 노래 제목/아티스트 추출
- **Spotify 검색**: Spotify Web API로 재생 가능 여부 확인 및 정확한 제목·ID 획득
- **Spotify 재생**: Web Playback SDK로 브라우저에서 직접 재생
- **로컬 스토리지**: 마지막 재생 곡의 제목·아티스트 저장

## 사전 요구사항

- Node.js 18+
- [Spotify Developer](https://developer.spotify.com/dashboard) 앱 (Client ID)
- [OpenAI API Key](https://platform.openai.com/api-keys)
- **Spotify Premium** 계정 (Web Playback SDK 필수)

## Spotify 앱 설정

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)에서 앱 생성
2. **Redirect URIs**에 `http://localhost:5173/callback` 추가
3. Client ID 복사

## 설치 및 실행

```bash
cp .env.example .env
# .env 파일에 API 키 입력

npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 사용 방법

1. **Spotify로 로그인** 클릭
2. 마이크 버튼을 누르고 노래 요청 (예: "아이유 좋은 날 틀어줘", "보헤미안 랩소디 재생해줘")
3. ChatGPT가 제목을 추출하고 Spotify에서 검색·재생
4. 마지막 재생 곡은 로컬 스토리지에 자동 저장

## 아키텍처

```
음성 입력 → Web Speech API → ChatGPT (제목 추출)
                                    ↓
                          Spotify Search API (검색·ID 확인)
                                    ↓
                          Spotify Web Playback SDK (재생)
                                    ↓
                          localStorage (마지막 재생 곡 저장)
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `VITE_OPENAI_API_KEY` | OpenAI API 키 |
| `VITE_SPOTIFY_CLIENT_ID` | Spotify 앱 Client ID |
| `VITE_SPOTIFY_REDIRECT_URI` | OAuth 콜백 URI (기본: `http://localhost:5173/callback`) |

## Vercel Deployment Preview

이 프로젝트는 Vercel MCP(`https://mcp.vercel.com`)로 배포 프리뷰를 조회합니다.

1. Cursor에서 **Customize → MCP** 또는 [Integrations & MCP](https://cursor.com/dashboard)에 Vercel 서버를 추가합니다.
2. `Needs login`을 눌러 Vercel 계정으로 OAuth 인증합니다.
3. [Vercel Dashboard](https://vercel.com/new)에서 이 GitHub 리포지토리를 Import하면 PR마다 Preview URL이 생성됩니다.

Cloud Agent에서 MCP를 쓰려면 Cursor Dashboard의 Team MCP에도 `https://mcp.vercel.com`을 등록해야 합니다.

## 기술 스택

- React 19 + TypeScript
- Vite
- Spotify Web API + Web Playback SDK (OAuth PKCE)
- OpenAI Chat Completions API
- Web Speech API
- Vercel (Deployment Preview + MCP)
