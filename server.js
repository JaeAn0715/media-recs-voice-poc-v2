'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const { recommend } = require('./lib/recommender');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function handleRecommend(req, res) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    let query = '';
    let limit;
    try {
      if (raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        query = typeof parsed.query === 'string' ? parsed.query : '';
        limit = Number.isInteger(parsed.limit) ? parsed.limit : undefined;
      }
    } catch (err) {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    if (!query.trim()) {
      sendJson(res, 400, { error: 'Missing "query" in request body' });
      return;
    }

    const results = recommend(query, { limit });
    sendJson(res, 200, {
      query,
      spoken: buildSpokenResponse(query, results),
      results,
    });
  });
}

function buildSpokenResponse(query, results) {
  if (results.length === 0) {
    return `I could not find a good match for "${query}". Try naming a genre or mood, like a relaxing documentary or an intense thriller.`;
  }
  const top = results[0];
  const others = results.slice(1, 3).map((r) => r.title);
  let spoken = `Based on "${query}", I recommend ${top.title}, a ${top.year} ${top.genres[0]} ${top.type}. ${top.reason}`;
  if (others.length > 0) {
    spoken += ` You might also enjoy ${others.join(' and ')}.`;
  }
  return spoken;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/recommend') {
    handleRecommend(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }
  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }
  sendJson(res, 405, { error: 'Method not allowed' });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`media-recs-voice-poc-v2 listening on http://${HOST}:${PORT}`);
  });
}

module.exports = { server, buildSpokenResponse };
