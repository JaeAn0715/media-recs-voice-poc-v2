import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { getLine, getStations, LINES } from '@shared/transitNetwork.ts'
import { registerPushSubscription } from './lib/push.ts'
import type { TrackSnapshot } from './lib/types.ts'

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

function App() {
  const [lineId, setLineId] = useState(LINES[1].id)
  const line = getLine(lineId) ?? LINES[1]
  const stations = getStations(line)
  const [boarding, setBoarding] = useState('강남')
  const [destination, setDestination] = useState('잠실')
  const [track, setTrack] = useState<TrackSnapshot>()
  const [isFinding, setIsFinding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [pushStatus, setPushStatus] = useState('')
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(20)
  const requestId = useRef(0)

  const selectLine = (newLineId: string) => {
    const newLine = getLine(newLineId) ?? LINES[0]
    const defaultRoute = DEFAULT_ROUTES[newLineId] ?? [
      newLine.routes[0][0],
      newLine.routes[0][1],
    ]
    setLineId(newLineId)
    setBoarding(defaultRoute[0])
    setDestination(defaultRoute[1])
    setTrack(undefined)
    setError('')
    setPushStatus('')
  }

  const readJson = async <T,>(response: Response) => {
    const body = (await response.json()) as T & { message?: string }
    if (!response.ok) throw new Error(body.message ?? '요청에 실패했습니다.')
    return body
  }

  const refreshTrack = useCallback(
    async (trackId: string, silent = false) => {
      if (!silent) setIsRefreshing(true)
      try {
        const response = await fetch(`/api/tracks/${trackId}`)
        setTrack(await readJson<TrackSnapshot>(response))
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : '위치 갱신에 실패했습니다.',
        )
      } finally {
        setSecondsUntilRefresh(20)
        setIsRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!track?.trackId) return
    const trackId = track.trackId
    const refreshTimer = window.setInterval(() => {
      void refreshTrack(trackId, true)
    }, 20_000)
    const countdownTimer = window.setInterval(() => {
      setSecondsUntilRefresh((seconds) => (seconds <= 1 ? 20 : seconds - 1))
    }, 1_000)

    return () => {
      window.clearInterval(refreshTimer)
      window.clearInterval(countdownTimer)
    }
  }, [refreshTrack, track?.trackId])

  const findTrain = async (event: React.FormEvent) => {
    event.preventDefault()
    if (boarding === destination) {
      setError('승차역과 하차역은 서로 달라야 합니다.')
      return
    }

    const currentRequest = ++requestId.current
    setIsFinding(true)
    setError('')
    setTrack(undefined)

    try {
      let subscription: PushSubscriptionJSON | undefined
      try {
        subscription = await registerPushSubscription()
        setPushStatus(
          subscription
            ? '목적지 1역 전 푸시 알림을 보내드립니다.'
            : '브라우저 알림이 꺼져 있어 화면에서만 추적합니다.',
        )
      } catch {
        setPushStatus('푸시 구독에 실패해 화면에서만 추적합니다.')
      }

      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId,
          boarding,
          destination,
          subscription,
        }),
      })
      const snapshot = await readJson<TrackSnapshot>(response)
      if (requestId.current !== currentRequest) return
      setTrack(snapshot)
      setSecondsUntilRefresh(20)
    } catch (caught) {
      if (requestId.current !== currentRequest) return
      setError(
        caught instanceof Error
          ? caught.message
          : '열차 정보를 불러오지 못했습니다.',
      )
    } finally {
      if (requestId.current === currentRequest) setIsFinding(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="서울 지하철 트래커 홈">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>서울 지하철 트래커</span>
        </a>
        <span className="live-chip">
          <span className="live-dot" />
          실시간 운행정보
        </span>
      </header>

      <section className="hero-copy">
        <p className="eyebrow">SEOUL METRO LIVE</p>
        <h1>내가 탈 열차, 지금 어디쯤일까요?</h1>
        <p>
          백엔드가 전체 열차 위치를 20초마다 갱신하고
          <br className="desktop-only" /> 목적지 1역 전에 웹 푸시로 알려드려요.
        </p>
      </section>

      <section className="tracker-grid">
        <form className="search-card" onSubmit={findTrain}>
          <div className="card-heading">
            <div className="heading-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 17h10M8 20l-2 2m10-2 2 2M6 4h12a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm1 8h10M8 8h.01M16 8h.01" />
              </svg>
            </div>
            <div>
              <h2>이동 경로</h2>
              <p>탑승할 노선과 역을 선택해 주세요</p>
            </div>
          </div>

          <label className="field">
            <span>노선</span>
            <div className="select-wrap">
              <span
                className="line-symbol"
                style={{ backgroundColor: line.color }}
              >
                {line.shortName}
              </span>
              <select
                value={lineId}
                onChange={(event) => selectLine(event.target.value)}
              >
                {LINES.map((item) => (
                  <option key={item.id} value={item.id}>
                    서울 지하철 {item.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="station-fields">
            <label className="field">
              <span>타는 역</span>
              <div className="select-wrap station-select">
                <span className="station-dot start" />
                <select
                  value={boarding}
                  onChange={(event) => setBoarding(event.target.value)}
                >
                  {stations.map((station) => (
                    <option key={station} value={station}>
                      {station}역
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <div className="route-line" aria-hidden="true" />
            <label className="field">
              <span>내릴 역</span>
              <div className="select-wrap station-select">
                <span className="station-dot end" />
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                >
                  {stations.map((station) => (
                    <option key={station} value={station}>
                      {station}역
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button className="submit-button" type="submit" disabled={isFinding}>
            {isFinding ? (
              <>
                <span className="spinner" /> 열차 찾는 중
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                </svg>
                다음 열차 찾기
              </>
            )}
          </button>
        </form>

        <section className={`status-card ${track ? 'active' : ''}`}>
          {!track ? (
            <div className="empty-state">
              <div className="empty-illustration" aria-hidden="true">
                <div className="rail rail-left" />
                <div className="rail rail-right" />
                <div className="train-face">
                  <div className="train-window">
                    <span />
                    <span />
                  </div>
                  <div className="train-number">SEOUL</div>
                  <div className="train-lights">
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <h2>열차를 기다리고 있어요</h2>
              <p>
                왼쪽에서 이동 경로를 선택하면
                <br />
                가장 먼저 도착할 열차를 찾아드릴게요.
              </p>
            </div>
          ) : (
            <div className="live-status">
              <div className="status-topline">
                <span className="line-pill" style={{ background: line.color }}>
                  {line.shortName}
                </span>
                <span className="train-label">열차 {track.trainNo}</span>
                <span className="tracking-chip">
                  <span className="live-dot" /> 추적 중
                </span>
              </div>

              <p className="route-summary">
                {track.boarding}역 <span>→</span> {track.destination}역
              </p>
              <div className="current-status">
                <span className="status-kicker">현재 열차 상태</span>
                <h2>{track.statusText || '위치 확인 중'}</h2>
                {track.position &&
                  track.nextStation &&
                  track.position.trainSttus !== '1' && (
                    <p>{track.nextStation}역 방면으로 운행하고 있어요</p>
                  )}
                {track.remainingStations === 1 && (
                  <p>목적지까지 1역 남았습니다.</p>
                )}
                {!track.position && (
                  <p>
                    {track.arrivalDetail ??
                      `${track.boarding}역 도착 정보를 확인했어요`}
                  </p>
                )}
              </div>

              <div className="detail-grid">
                <div>
                  <span>운행 방향</span>
                  <strong>{track.trainLineNm ?? '-'}</strong>
                </div>
                <div>
                  <span>열차 종류</span>
                  <strong>{track.trainType ?? '일반'}</strong>
                </div>
                <div>
                  <span>남은 역</span>
                  <strong>
                    {track.remainingStations === null
                      ? '확인 중'
                      : `${track.remainingStations}개`}
                  </strong>
                </div>
                <div>
                  <span>다음 갱신</span>
                  <strong>{secondsUntilRefresh}초 후</strong>
                </div>
              </div>

              {track.warning && (
                <p className="refresh-warning" role="status">
                  {track.warning}
                </p>
              )}
              {pushStatus && <p className="push-note">{pushStatus}</p>}
              <div className="update-row">
                <span>
                  {track.cacheUpdatedAt
                    ? `${new Date(track.cacheUpdatedAt).toLocaleTimeString('ko-KR')} 캐시`
                    : '위치 정보 확인 중'}
                </span>
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={() => void refreshTrack(track.trackId)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 6v5h-5M4 18v-5h5m10-2a7 7 0 0 0-12-4L4 11m1 2a7 7 0 0 0 12 4l3-4" />
                  </svg>
                  지금 갱신
                </button>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer>
        서울특별시 열린데이터광장 실시간 지하철 정보를 사용합니다.
      </footer>
    </main>
  )
}

export default App
