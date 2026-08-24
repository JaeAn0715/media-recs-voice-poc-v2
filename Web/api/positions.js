import { errorPayload, fetchSeoulApi, parseLine } from '../server/seoulApi.js'

export default async function handler(req, res) {
  try {
    const line = parseLine(req.query?.line)
    const data = await fetchSeoulApi(
      `realtimePosition/0/200/${encodeURIComponent(line)}`,
    )
    res.status(200).json({ positions: data.realtimePositionList ?? [] })
  } catch (error) {
    const { status, message } = errorPayload(error)
    res.status(status).json({ message })
  }
}
