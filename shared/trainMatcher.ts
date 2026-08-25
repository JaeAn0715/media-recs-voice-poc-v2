import type { Line } from './transitNetwork.ts'
import { normalizeStation } from './transitNetwork.ts'

export type Arrival = {
  subwayId: string
  updnLine?: string
  trainLineNm?: string
  statnNm?: string
  btrainSttus?: string
  barvlDt?: string
  btrainNo: string
  bstatnNm?: string
  recptnDt?: string
  arvlMsg2?: string
  arvlMsg3?: string
  arvlCd?: string
}

export type TrainPosition = {
  subwayId: string
  subwayNm?: string
  statnId?: string
  statnNm: string
  trainNo: string
  lastRecptnDt?: string
  recptnDt?: string
  updnLine?: string
  statnTid?: string
  statnTnm?: string
  trainSttus?: string
  directAt?: string
  lstcarAt?: string
}

const buildGraph = (line: Line) => {
  const graph = new Map<string, Set<string>>()

  const connect = (from: string, to: string) => {
    if (!graph.has(from)) graph.set(from, new Set())
    graph.get(from)?.add(to)
  }

  line.routes.forEach((route) => {
    route.slice(0, -1).forEach((station, index) => {
      const from = normalizeStation(station)
      const to = normalizeStation(route[index + 1])
      connect(from, to)
      connect(to, from)
    })
  })

  return graph
}

export const shortestPath = (line: Line, start: string, destination: string) => {
  const from = normalizeStation(start)
  const to = normalizeStation(destination)
  const graph = buildGraph(line)
  const queue: string[][] = [[from]]
  const visited = new Set([from])

  while (queue.length) {
    const path = queue.shift()
    if (!path) break
    const current = path.at(-1)
    if (!current) continue
    if (current === to) return path

    for (const next of graph.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push([...path, next])
      }
    }
  }

  return []
}

export const remainingOnPath = (path: string[], currentStation: string) => {
  const current = normalizeStation(currentStation)
  const index = path.findIndex((station) => normalizeStation(station) === current)
  if (index < 0) return null
  return path.length - 1 - index
}

export const shouldNotifyOneStop = (
  alreadyNotified: boolean,
  path: string[],
  currentStation?: string,
) => {
  if (alreadyNotified || !currentStation) return false
  return remainingOnPath(path, currentStation) === 1
}

const getDirectionStation = (arrival: Arrival) => {
  const direction = arrival.trainLineNm?.match(/-\s*(.+?)\s*방면/)?.[1]
  return direction ? normalizeStation(direction) : undefined
}

const getTerminalStation = (arrival: Arrival) => {
  if (arrival.bstatnNm) return normalizeStation(arrival.bstatnNm)
  const terminal = arrival.trainLineNm?.match(/^(.+?)행/)?.[1]
  return terminal ? normalizeStation(terminal) : undefined
}

export const findNextTrain = (
  arrivals: Arrival[],
  line: Line,
  boarding: string,
  destination: string,
) => {
  const requestedPath = shortestPath(line, boarding, destination)
  const nextStation = requestedPath[1]

  if (!nextStation) return undefined

  const lineArrivals = arrivals.filter(
    (arrival) => arrival.subwayId === line.id && arrival.btrainNo,
  )

  const directionMatches = lineArrivals.filter(
    (arrival) => getDirectionStation(arrival) === nextStation,
  )

  const candidates =
    directionMatches.length > 0
      ? directionMatches
      : lineArrivals.filter((arrival) => {
          const terminal = getTerminalStation(arrival)
          if (!terminal) return false
          const terminalPath = shortestPath(line, boarding, terminal)
          return (
            terminalPath[1] === nextStation &&
            terminalPath.includes(normalizeStation(destination))
          )
        })

  return candidates.sort(
    (a, b) =>
      Number(a.barvlDt ?? Number.MAX_SAFE_INTEGER) -
      Number(b.barvlDt ?? Number.MAX_SAFE_INTEGER),
  )[0]
}

export const POSITION_LABELS: Record<string, string> = {
  '0': '역 진입',
  '1': '역 도착',
  '2': '역 출발',
  '3': '전역 출발',
}

export const ARRIVAL_LABELS: Record<string, string> = {
  '0': '진입',
  '1': '도착',
  '2': '출발',
  '3': '전역 출발',
  '4': '전역 진입',
  '5': '전역 도착',
  '99': '운행 중',
}

export const formatTrainStatus = (
  position?: TrainPosition,
  fallback?: string,
) => {
  if (!position) return fallback || '위치 확인 중'
  if (position.trainSttus === '1') return `${position.statnNm}역에 정차 중`
  if (position.trainSttus === '0') return `${position.statnNm}역으로 진입 중`
  if (position.trainSttus === '2') return `${position.statnNm}역에서 출발`
  return `${position.statnNm}역 전역에서 출발`
}
