export type SeoulApiResponse = {
  errorMessage?: { status?: number; code?: string; message?: string }
  realtimeArrivalList?: unknown[]
  realtimePositionList?: unknown[]
  RESULT?: { CODE?: string; MESSAGE?: string }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status?: number)
}

export function fetchSeoulApi(endpoint: string): Promise<SeoulApiResponse>
export function parseStation(value: unknown): string
export function parseLine(value: unknown): string
export function errorPayload(error: unknown): { status: number; message: string }
