# 지하철 트래커 백엔드

1~9호선 실시간 열차 위치를 20초마다 가져와 메모리에 보관합니다. 웹 클라이언트가 추적 중인 열차만 조회하고, 목적지까지 1역이 남으면 웹 푸시를 보냅니다.

## 실행

```bash
npm install
cp .env.example .env
```

`.env`에 서울 열린데이터광장 지하철 API 키를 넣습니다. VAPID 키가 없으면 서버가 시작될 때 생성해 `.vapid.json`에 저장합니다.

```bash
npm run dev
```

기본 주소는 `http://localhost:8787`입니다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 캐시 갱신 시각과 열차 수 |
| `GET` | `/api/lines` | 호선·역 목록 |
| `GET` | `/api/push/vapid-key` | 웹 푸시 공개키 |
| `POST` | `/api/tracks` | 다음 열차 추적 시작 |
| `GET` | `/api/tracks/:trackId` | 추적 중인 열차의 캐시된 위치 |
| `POST` | `/api/tracks/:trackId/subscription` | 푸시 구독 연결 |

`POST /api/tracks` 본문:

```json
{
  "lineId": "1002",
  "boarding": "강남",
  "destination": "잠실",
  "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
}
```

추적은 3시간 뒤 만료됩니다.
