import type { TrainPosition } from '@shared/trainMatcher.ts'

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
