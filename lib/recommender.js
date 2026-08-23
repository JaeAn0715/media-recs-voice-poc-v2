'use strict';

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'media.json');

let catalogCache = null;

function loadCatalog() {
  if (!catalogCache) {
    catalogCache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  }
  return catalogCache;
}

// Maps free-form spoken words to the structured genre/mood vocabulary in the catalog.
const SYNONYMS = {
  scifi: 'sci-fi',
  'science fiction': 'sci-fi',
  space: 'sci-fi',
  futuristic: 'sci-fi',
  funny: 'comedy',
  hilarious: 'comedy',
  laugh: 'comedy',
  scary: 'horror',
  spooky: 'horror',
  cartoon: 'animation',
  animated: 'animation',
  kids: 'family',
  'feel good': 'feel-good',
  feelgood: 'feel-good',
  relaxing: 'relaxing',
  chill: 'relaxing',
  cozy: 'heartwarming',
  sad: 'emotional',
  emotional: 'emotional',
  tense: 'intense',
  gripping: 'gripping',
  smart: 'thoughtful',
  clever: 'witty',
  nostalgic: 'nostalgic',
  epic: 'epic',
  mystery: 'mystery',
  detective: 'mystery',
  crime: 'crime',
  romantic: 'romance',
  love: 'romance',
  documentary: 'documentary',
  nature: 'nature',
  music: 'music',
  musical: 'music',
  show: 'series',
  shows: 'series',
  series: 'series',
  tv: 'series',
  movie: 'movie',
  movies: 'movie',
  film: 'movie',
  films: 'movie',
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'me', 'i', 'my', 'to', 'for', 'of', 'and', 'or', 'with',
  'want', 'like', 'something', 'some', 'recommend', 'recommendation', 'watch',
  'watching', 'find', 'please', 'give', 'suggest', 'in', 'on', 'that',
  'is', 'are', 'about', 'looking', 'feeling', 'feel', 'mood', 'tonight', 'good',
]);

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
}

function extractTokens(query) {
  const normalized = normalize(query);

  const canonical = new Set();

  // Multi-word synonyms first (e.g. "science fiction").
  for (const [phrase, target] of Object.entries(SYNONYMS)) {
    if (phrase.includes(' ') && normalized.includes(phrase)) {
      canonical.add(target);
    }
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    canonical.add(SYNONYMS[word] || word);
  }

  return canonical;
}

// Detect an explicit decade filter such as "90s", "1990s", "eighties".
const DECADE_WORDS = {
  seventies: 1970,
  eighties: 1980,
  nineties: 1990,
  '70s': 1970,
  '80s': 1980,
  '90s': 1990,
  '00s': 2000,
  '2000s': 2000,
  '2010s': 2010,
  '1970s': 1970,
  '1980s': 1980,
  '1990s': 1990,
};

function detectDecade(query) {
  const normalized = normalize(query);
  for (const [word, decade] of Object.entries(DECADE_WORDS)) {
    if (normalized.includes(word)) return decade;
  }
  return null;
}

function scoreItem(item, tokens, decade) {
  let score = 0;
  const reasons = [];

  for (const token of tokens) {
    if (item.genres.includes(token)) {
      score += 5;
      reasons.push(`matches the ${token} genre`);
    } else if (item.moods.includes(token)) {
      score += 4;
      reasons.push(`has a ${token} vibe`);
    } else if (item.type === token) {
      score += 3;
    } else if (item.title.toLowerCase().includes(token)) {
      score += 6;
      reasons.push(`matches the title`);
    } else if (item.description.toLowerCase().includes(token)) {
      score += 2;
      reasons.push(`fits the theme`);
    }
  }

  if (decade !== null) {
    if (item.year >= decade && item.year < decade + 10) {
      score += 4;
      reasons.push(`is from the ${decade}s`);
    } else {
      score -= 3;
    }
  }

  return { score, reasons };
}

function buildReason(reasons) {
  const unique = [...new Set(reasons)];
  if (unique.length === 0) return 'A well-loved pick worth a watch.';
  const capitalized = unique[0].charAt(0).toUpperCase() + unique[0].slice(1);
  if (unique.length === 1) return `${capitalized}.`;
  return `${capitalized} and ${unique.slice(1, 3).join(', ')}.`;
}

function recommend(query, options = {}) {
  const limit = options.limit && options.limit > 0 ? options.limit : 4;
  const catalog = options.catalog || loadCatalog();
  const tokens = extractTokens(query);
  const decade = detectDecade(query);

  const scored = catalog
    .map((item) => {
      const { score, reasons } = scoreItem(item, tokens, decade);
      return { item, score, reasons };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.item.year - a.item.year);

  const chosen = scored.slice(0, limit);

  // Fallback: if nothing matched, surface a few highly-rated staples.
  const pool = chosen.length > 0 ? chosen : catalog.slice(0, limit).map((item) => ({ item, score: 0, reasons: [] }));

  return pool.map(({ item, score, reasons }) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    year: item.year,
    genres: item.genres,
    moods: item.moods,
    description: item.description,
    score,
    reason: buildReason(reasons),
  }));
}

module.exports = { recommend, extractTokens, detectDecade, loadCatalog };
