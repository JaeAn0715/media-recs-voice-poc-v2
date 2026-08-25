import 'dotenv/config'
import { createApp } from './app.ts'
import { onPositionRefresh, startPositionPolling } from './positions.ts'
import { notifyDueTracks } from './tracks.ts'

const port = Number(process.env.PORT ?? 8787)
const app = createApp()

onPositionRefresh(() => notifyDueTracks())
startPositionPolling()

app.listen(port, '0.0.0.0', () => {
  console.log(`Subway tracker backend listening on http://0.0.0.0:${port}`)
})
