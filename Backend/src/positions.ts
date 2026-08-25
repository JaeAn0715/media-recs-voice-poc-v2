import { LINES } from '../../shared/transitNetwork.ts'
import type { TrainPosition } from '../../shared/trainMatcher.ts'
import { fetchSeoulApi } from './seoulApi.ts'

export const REFRESH_MS = 20_000

export type PositionCache = {
  trains: Map<string, TrainPosition>
  lastRefresh: Date | null
  lastError: string | null
  trainCount: number
}

export const positionCache: PositionCache = {
  trains: new Map(),
  lastRefresh: null,
  lastError: null,
  trainCount: 0,
}

type RefreshListener = () => void | Promise<void>

const listeners = new Set<RefreshListener>()

export const trainKey = (lineId: string, trainNo: string) =>
  `${lineId}:${String(trainNo)}`

export const getCachedTrain = (lineId: string, trainNo: string) =>
  positionCache.trains.get(trainKey(lineId, trainNo))

export const onPositionRefresh = (listener: RefreshListener) => {
  listeners.add(listener)
}

export const refreshPositions = async () => {
  const results = await Promise.allSettled(
    LINES.map(async (line) => {
      const data = await fetchSeoulApi(
        `realtimePosition/0/200/${encodeURIComponent(line.name)}`,
      )
      return {
        lineId: line.id,
        positions: (data.realtimePositionList ?? []) as TrainPosition[],
      }
    }),
  )

  const next = new Map<string, TrainPosition>()
  const errors: string[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(
        result.reason instanceof Error
          ? result.reason.message
          : '호선 위치 갱신에 실패했습니다.',
      )
      continue
    }

    for (const position of result.value.positions) {
      if (!position.trainNo) continue
      next.set(trainKey(result.value.lineId, position.trainNo), position)
    }
  }

  if (next.size > 0 || positionCache.trains.size === 0) {
    positionCache.trains = next
    positionCache.trainCount = next.size
  }

  positionCache.lastRefresh = new Date()
  positionCache.lastError = errors[0] ?? null

  for (const listener of listeners) {
    await listener()
  }
}

export const startPositionPolling = () => {
  void refreshPositions().catch((error: unknown) => {
    positionCache.lastError =
      error instanceof Error ? error.message : '위치 캐시를 시작하지 못했습니다.'
  })

  const timer = setInterval(() => {
    void refreshPositions().catch((error: unknown) => {
      positionCache.lastError =
        error instanceof Error ? error.message : '위치 캐시 갱신에 실패했습니다.'
    })
  }, REFRESH_MS)

  timer.unref?.()
}
