# 서울 지하철 트래커

서울시 지하철 실시간 도착정보와 열차 위치정보 API를 이용하는 React 테스트 웹뷰입니다.

## 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env
```

`.env`에 [서울 열린데이터광장](https://data.seoul.go.kr/)에서 발급받은 지하철 Open API 인증키를 입력합니다.

```dotenv
SEOUL_SUBWAY_API_KEY=발급받은_인증키
```

개발 서버를 실행합니다.

```bash
npm run dev
```

- React 웹: `http://localhost:5173`
- API 프록시: `http://localhost:8787`

프로덕션 빌드와 실행:

```bash
npm run build
npm start
```

프로덕션 서버는 `PORT` 환경 변수(기본값 `8787`)를 사용하며 빌드된 웹과 API를 함께 제공합니다.

## 동작 방식

1. 승차역 실시간 도착정보에서 선택한 호선과 목적지 방향에 맞는 가장 빠른 열차를 선택합니다.
2. 응답의 열차번호(`btrainNo`)를 저장합니다.
3. 해당 호선의 실시간 열차 위치에서 같은 열차번호(`trainNo`)를 찾아 상태를 표시합니다.
4. 위치정보를 20초 간격으로 다시 요청합니다.

인증키는 브라우저 번들에 포함하지 않고 Express 프록시에서만 사용합니다.
