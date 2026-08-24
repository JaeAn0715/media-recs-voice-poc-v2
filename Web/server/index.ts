import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ApiError,
  errorPayload,
  fetchSeoulApi,
  parseLine,
  parseStation,
} from './seoulApi.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)

const asyncRoute =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

app.disable('x-powered-by')

app.get(
  '/api/arrivals',
  asyncRoute(async (req, res) => {
    const station = parseStation(req.query.station)
    const data = await fetchSeoulApi(
      `realtimeStationArrival/0/30/${encodeURIComponent(station)}`,
    )
    res.json({ arrivals: data.realtimeArrivalList ?? [] })
  }),
)

app.get(
  '/api/positions',
  asyncRoute(async (req, res) => {
    const line = parseLine(req.query.line)
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
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const { status, message } = errorPayload(error)
    res.status(error instanceof ApiError ? error.status : status).json({
      message,
    })
  },
)

app.listen(port, () => {
  console.log(`Subway tracker server listening on http://localhost:${port}`)
})
