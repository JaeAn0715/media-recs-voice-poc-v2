import 'dotenv/config'
import { createApp } from './app.ts'
import { onPositionRefresh, startPositionPolling } from './positions.ts'
import { notifyDueTracks } from './tracks.ts'

const port = Number(process.env.PORT ?? 8787)
const app = createApp()

onPositionRefresh(() => notifyDueTracks())
startPositionPolling()

app.listen(port, () => {
  console.log(`Subway tracker backend listening on http://localhost:${port}`)
})
