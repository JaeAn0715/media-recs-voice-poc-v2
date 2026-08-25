# 서울 지하철 트래커 웹

백엔드가 모아 둔 열차 위치를 보여주는 React 웹뷰입니다. 목적지까지 1역이 남으면 백엔드가 웹 푸시를 보냅니다.

## 실행

백엔드를 먼저 띄운 뒤 웹을 실행합니다.

```bash
cd ../Backend
npm install
cp .env.example .env
npm run dev
```

```bash
cd ../Web
npm install
npm run dev
```

웹은 `http://localhost:5173`에서 `/api` 요청을 `http://localhost:8787`로 프록시합니다.
