import { errorPayload, fetchSeoulApi, parseLine } from '../server/seoulApi.js'

export async function GET(request) {
  try {
    const line = parseLine(new URL(request.url).searchParams.get('line'))
    const data = await fetchSeoulApi(
      `realtimePosition/0/200/${encodeURIComponent(line)}`,
    )
    return Response.json({ positions: data.realtimePositionList ?? [] })
  } catch (error) {
    const { status, message } = errorPayload(error)
    return Response.json({ message }, { status })
  }
}
