import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const apiKey = process.env.SEOUL_SUBWAY_API_KEY
const subwayApiBase = 'http://swopenapi.seoul.go.kr/api/subway'
const allowedLines = new Set(Array.from({ length: 9 }, (_, index) => `${index + 1}호선`))

type SeoulApiResponse = {
  errorMessage?: { status?: number; code?: string; message?: string }
  realtimeArrivalList?: unknown[]
  realtimePositionList?: unknown[]
  RESULT?: { CODE?: string; MESSAGE?: string }
}

class ApiError extends Error {
  status: number

  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

const fetchSeoulApi = async (endpoint: string) => {
  if (!apiKey) {
    throw new ApiError(
      '서울 열린데이터광장 인증키가 설정되지 않았습니다. SEOUL_SUBWAY_API_KEY를 확인해 주세요.',
      503,
    )
  }

  const response = await fetch(`${subwayApiBase}/${apiKey}/json/${endpoint}`, {
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new ApiError(`서울시 API가 HTTP ${response.status}로 응답했습니다.`)
  }

  const data = (await response.json()) as SeoulApiResponse
  const apiError = data.errorMessage
  const resultError = data.RESULT

  if (
    (apiError?.status && apiError.status >= 400) ||
    (resultError?.CODE && resultError.CODE !== 'INFO-000')
  ) {
    throw new ApiError(
      apiError?.message ?? resultError?.MESSAGE ?? '서울시 API 요청에 실패했습니다.',
      apiError?.status === 404 ? 404 : 502,
    )
  }

  return data
}

const asyncRoute =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

app.disable('x-powered-by')

app.get(
  '/api/arrivals',
  asyncRoute(async (req, res) => {
    const station = String(req.query.station ?? '').trim()
    if (!station || station.length > 30) {
      res.status(400).json({ message: '올바른 승차역을 입력해 주세요.' })
      return
    }

    const data = await fetchSeoulApi(
      `realtimeStationArrival/0/30/${encodeURIComponent(station)}`,
    )
    res.json({ arrivals: data.realtimeArrivalList ?? [] })
  }),
)

app.get(
  '/api/positions',
  asyncRoute(async (req, res) => {
    const line = String(req.query.line ?? '').trim()
    if (!allowedLines.has(line)) {
      res.status(400).json({ message: '지원하지 않는 호선입니다.' })
      return
    }

    const data = await fetchSeoulApi(
      `realtimePosition/0/200/${encodeURIComponent(line)}`,
    )
    res.json({ positions: data.realtimePositionList ?? [] })
  }),
)

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(currentDirectory, '../dist')
app.use(express.static(distPath))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next()
    return
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

app.use(
  (
    error: Error & { status?: number; name?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const isTimeout = error.name === 'TimeoutError'
    res.status(isTimeout ? 504 : (error.status ?? 500)).json({
      message: isTimeout
        ? '서울시 API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
        : error.message || '서버 오류가 발생했습니다.',
    })
  },
)

app.listen(port, () => {
  console.log(`Subway tracker server listening on http://localhost:${port}`)
})
