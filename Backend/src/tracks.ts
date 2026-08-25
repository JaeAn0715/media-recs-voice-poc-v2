import { randomUUID } from 'node:crypto'
import { getLine, normalizeStation } from '../../shared/transitNetwork.ts'
import {
  ARRIVAL_LABELS,
  findNextTrain,
  formatTrainStatus,
  POSITION_LABELS,
  remainingOnPath,
  shouldNotifyOneStop,
  shortestPath,
  type Arrival,
  type TrainPosition,
} from '../../shared/trainMatcher.ts'
import { getCachedTrain, positionCache } from './positions.ts'
import {
  isPushSubscription,
  sendPush,
  type PushSubscriptionJSON,
} from './push.ts'
import { ApiError, fetchSeoulApi } from './seoulApi.ts'

const TRACK_TTL_MS = 3 * 60 * 60 * 1000

export type Track = {
  id: string
  lineId: string
  trainNo: string
  boarding: string
  destination: string
  path: string[]
  arrival: Arrival
  subscription?: PushSubscriptionJSON
  notifiedOneStop: boolean
  createdAt: number
}

export type TrackSnapshot = {
  trackId: string
  lineId: string
  lineName: string
  trainNo: string
  boarding: string
  destination: string
  trainLineNm?: string
  trainType?: string
  arrivalMessage?: string
  arrivalDetail?: string
  position?: TrainPosition
  remainingStations: number | null
  nextStation?: string
  statusText: string
  statusLabel: string
  oneStationAway: boolean
  cacheUpdatedAt?: string
  warning?: string
}

const tracks = new Map<string, Track>()

const pruneTracks = () => {
  const now = Date.now()
  for (const [id, track] of tracks) {
    if (now - track.createdAt > TRACK_TTL_MS) tracks.delete(id)
  }
}

export const getTrack = (trackId: string) => tracks.get(trackId)

export const buildSnapshot = (track: Track): TrackSnapshot => {
  const line = getLine(track.lineId)
  const position = getCachedTrain(track.lineId, track.trainNo)
  const remaining = position
    ? remainingOnPath(track.path, position.statnNm)
    : null
  const currentIndex = position
    ? track.path.findIndex(
        (station) =>
          normalizeStation(station) === normalizeStation(position.statnNm),
      )
    : -1

  return {
    trackId: track.id,
    lineId: track.lineId,
    lineName: line?.name ?? '',
    trainNo: track.trainNo,
    boarding: track.boarding,
    destination: track.destination,
    trainLineNm: track.arrival.trainLineNm,
    trainType: track.arrival.btrainSttus,
    arrivalMessage: track.arrival.arvlMsg2,
    arrivalDetail: track.arrival.arvlMsg3,
    position,
    remainingStations: remaining,
    nextStation:
      currentIndex >= 0 ? track.path[currentIndex + 1] : track.path[1],
    statusText: formatTrainStatus(position, track.arrival.arvlMsg2),
    statusLabel: position
      ? (POSITION_LABELS[position.trainSttus ?? ''] ?? '운행 중')
      : (ARRIVAL_LABELS[track.arrival.arvlCd ?? ''] ?? '도착 예정'),
    oneStationAway: remaining === 1,
    cacheUpdatedAt: positionCache.lastRefresh?.toISOString(),
    warning: position
      ? undefined
      : '열차 위치가 아직 캐시에 없습니다. 다음 갱신을 기다립니다.',
  }
}

export const createTrack = async (input: {
  lineId: string
  boarding: string
  destination: string
  subscription?: unknown
}) => {
  pruneTracks()

  const line = getLine(input.lineId)
  if (!line) throw new ApiError('지원하지 않는 호선입니다.', 400)
  if (!input.boarding || !input.destination) {
    throw new ApiError('승차역과 하차역을 모두 선택해 주세요.', 400)
  }
  if (input.boarding === input.destination) {
    throw new ApiError('승차역과 하차역은 서로 달라야 합니다.', 400)
  }

  const path = shortestPath(line, input.boarding, input.destination)
  if (path.length < 2) {
    throw new ApiError('선택한 역 사이의 경로를 찾지 못했습니다.', 400)
  }

  const data = await fetchSeoulApi(
    `realtimeStationArrival/0/30/${encodeURIComponent(input.boarding)}`,
  )
  const arrival = findNextTrain(
    (data.realtimeArrivalList ?? []) as Arrival[],
    line,
    input.boarding,
    input.destination,
  )

  if (!arrival) {
    throw new ApiError(
      '현재 목적지 방향으로 운행하는 도착 예정 열차를 찾지 못했습니다.',
      404,
    )
  }

  const track: Track = {
    id: randomUUID(),
    lineId: line.id,
    trainNo: String(arrival.btrainNo),
    boarding: input.boarding,
    destination: input.destination,
    path,
    arrival,
    subscription: isPushSubscription(input.subscription)
      ? input.subscription
      : undefined,
    notifiedOneStop: false,
    createdAt: Date.now(),
  }

  tracks.set(track.id, track)
  await notifyTrackIfNeeded(track)
  return buildSnapshot(track)
}

export const attachSubscription = (
  trackId: string,
  subscription: unknown,
) => {
  const track = tracks.get(trackId)
  if (!track) throw new ApiError('추적 중인 열차를 찾지 못했습니다.', 404)
  if (!isPushSubscription(subscription)) {
    throw new ApiError('올바른 푸시 구독 정보가 아닙니다.', 400)
  }
  track.subscription = subscription
  return buildSnapshot(track)
}

const notifyTrackIfNeeded = async (track: Track) => {
  const position = getCachedTrain(track.lineId, track.trainNo)
  if (
    !shouldNotifyOneStop(
      track.notifiedOneStop,
      track.path,
      position?.statnNm,
    )
  ) {
    return
  }

  track.notifiedOneStop = true
  if (!track.subscription) return

  try {
    await sendPush(track.subscription, {
      title: '내릴 역이 다가옵니다',
      body: `${track.destination} 다음 역입니다. 내릴 준비를 해주세요.`,
      url: '/',
    })
  } catch (error) {
    console.error('Failed to send web push', error)
    track.subscription = undefined
  }
}

export const notifyDueTracks = async () => {
  pruneTracks()
  await Promise.all([...tracks.values()].map((track) => notifyTrackIfNeeded(track)))
}
