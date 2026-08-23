# media-recs-voice-poc-v2

A voice-driven media recommendation proof of concept. Ask for something to watch —
by genre, mood, or era — using your voice or the keyboard, and get suggestions back
as cards and as spoken audio.

## What it does

- Accepts a natural-language request such as _"an intense sci-fi movie from the 90s"_
  or _"a relaxing nature documentary"_.
- Uses a lightweight keyword/synonym/mood matching engine over a local catalog
  (`data/media.json`) to rank recommendations — no external API keys required.
- In the browser, captures voice input via the Web Speech API and reads the top
  pick back with speech synthesis.

## Tech

- **Runtime:** Node.js (>= 18). No external runtime dependencies — the server uses
  only the Node standard library.
- **Backend:** `server.js` (static hosting + `POST /api/recommend`).
- **Recommender:** `lib/recommender.js`.
- **Frontend:** `public/` (vanilla HTML/CSS/JS).

## Getting started

```bash
npm install        # no external deps, but keeps the workflow standard
npm start          # serves on http://localhost:3000
```

Then open http://localhost:3000 and either type a request or click the microphone
button to speak one.

### Development

```bash
npm run dev        # restarts the server on file changes (node --watch)
npm test           # runs the recommender unit tests (node --test)
```

## API

`POST /api/recommend`

Request body:

```json
{ "query": "a funny feel-good show", "limit": 4 }
```

Response body:

```json
{
  "query": "a funny feel-good show",
  "spoken": "Based on \"a funny feel-good show\", I recommend ...",
  "results": [
    {
      "id": "the-good-place",
      "title": "The Good Place",
      "type": "series",
      "year": 2016,
      "genres": ["comedy", "fantasy"],
      "reason": "Matches the comedy genre and has a feel-good vibe.",
      "score": 9
    }
  ]
}
```

`GET /api/health` returns `{ "status": "ok" }`.

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: it runs
`npm install` on setup and starts the dev server (`npm start`) on port 3000.
