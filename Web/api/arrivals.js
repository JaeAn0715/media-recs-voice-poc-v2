import {
  errorPayload,
  fetchSeoulApi,
  parseStation,
} from '../server/seoulApi.js'

export default async function handler(req, res) {
  try {
    const station = parseStation(req.query?.station)
    const data = await fetchSeoulApi(
      `realtimeStationArrival/0/30/${encodeURIComponent(station)}`,
    )
    res.status(200).json({ arrivals: data.realtimeArrivalList ?? [] })
  } catch (error) {
    const { status, message } = errorPayload(error)
    res.status(status).json({ message })
  }
}
