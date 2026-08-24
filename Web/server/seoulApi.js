const subwayApiBase = 'http://swopenapi.seoul.go.kr/api/subway'
const allowedLines = new Set(
  Array.from({ length: 9 }, (_, index) => `${index + 1}호선`),
)

export class ApiError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
  }
}

export const fetchSeoulApi = async (endpoint) => {
  const apiKey = process.env.SEOUL_SUBWAY_API_KEY
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

  const data = await response.json()
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

export const parseStation = (value) => {
  const station = String(value ?? '').trim()
  if (!station || station.length > 30) {
    throw new ApiError('올바른 승차역을 입력해 주세요.', 400)
  }
  return station
}

export const parseLine = (value) => {
  const line = String(value ?? '').trim()
  if (!allowedLines.has(line)) {
    throw new ApiError('지원하지 않는 호선입니다.', 400)
  }
  return line
}

export const errorPayload = (error) => {
  const isTimeout =
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.message.includes('aborted'))

  if (isTimeout) {
    return {
      status: 504,
      message: '서울시 API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
    }
  }

  return {
    status: error instanceof ApiError ? error.status : 500,
    message:
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
  }
}
