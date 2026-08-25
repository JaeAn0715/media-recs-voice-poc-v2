import cors from 'cors'
import express from 'express'
import { getLine, getStations, LINES } from '../../shared/transitNetwork.ts'
import { ApiError, errorPayload } from './seoulApi.ts'
import { getVapidPublicKey } from './push.ts'
import { positionCache } from './positions.ts'
import {
  attachSubscription,
  buildSnapshot,
  createTrack,
  getTrack,
} from './tracks.ts'

const asyncRoute =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

const DEFAULT_ROUTES: Record<string, [string, string]> = {
  '1001': ['서울역', '종각'],
  '1002': ['강남', '잠실'],
  '1003': ['고속터미널', '종로3가'],
  '1004': ['서울역', '사당'],
  '1005': ['광화문', '여의도'],
  '1006': ['공덕', '합정'],
  '1007': ['건대입구', '고속터미널'],
  '1008': ['잠실', '모란'],
  '1009': ['여의도', '고속터미널'],
}

export const createApp = () => {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      lastRefresh: positionCache.lastRefresh,
      trainCount: positionCache.trainCount,
      lastError: positionCache.lastError,
    })
  })

  app.get('/api/lines', (_req, res) => {
    res.json({
      lines: LINES.map((line) => ({
        id: line.id,
        name: line.name,
        shortName: line.shortName,
        color: line.color,
        stations: getStations(line),
        defaultRoute: DEFAULT_ROUTES[line.id] ?? [
          line.routes[0][0],
          line.routes[0][1],
        ],
      })),
    })
  })

  app.get('/api/push/vapid-key', (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() })
  })

  app.post(
    '/api/tracks',
    asyncRoute(async (req, res) => {
      const snapshot = await createTrack({
        lineId: String(req.body?.lineId ?? ''),
        boarding: String(req.body?.boarding ?? '').trim(),
        destination: String(req.body?.destination ?? '').trim(),
        subscription: req.body?.subscription,
      })
      res.status(201).json(snapshot)
    }),
  )

  app.get(
    '/api/tracks/:trackId',
    asyncRoute(async (req, res) => {
      const track = getTrack(String(req.params.trackId))
      if (!track) throw new ApiError('추적 중인 열차를 찾지 못했습니다.', 404)
      res.json(buildSnapshot(track))
    }),
  )

  app.post(
    '/api/tracks/:trackId/subscription',
    asyncRoute(async (req, res) => {
      const snapshot = attachSubscription(
        String(req.params.trackId),
        req.body?.subscription,
      )
      res.json(snapshot)
    }),
  )

  app.get('/api/lines/:lineId', (req, res, next) => {
    const line = getLine(String(req.params.lineId))
    if (!line) {
      next(new ApiError('지원하지 않는 호선입니다.', 400))
      return
    }
    res.json({
      id: line.id,
      name: line.name,
      shortName: line.shortName,
      color: line.color,
      stations: getStations(line),
    })
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

  return app
}
