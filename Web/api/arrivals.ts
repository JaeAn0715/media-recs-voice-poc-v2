import { errorPayload, fetchSeoulApi, parseStation } from '../server/seoulApi.ts'

export async function GET(request: Request) {
  try {
    const station = parseStation(new URL(request.url).searchParams.get('station'))
    const data = await fetchSeoulApi(
      `realtimeStationArrival/0/30/${encodeURIComponent(station)}`,
    )
    return Response.json({ arrivals: data.realtimeArrivalList ?? [] })
  } catch (error) {
    const { status, message } = errorPayload(error)
    return Response.json({ message }, { status })
  }
}
