'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { recommend, extractTokens, detectDecade } = require('../lib/recommender');
const { buildSpokenResponse } = require('../server');

test('extractTokens maps synonyms and drops stop words', () => {
  const tokens = extractTokens('recommend me a funny science fiction show');
  assert.ok(tokens.has('comedy'), 'funny -> comedy');
  assert.ok(tokens.has('sci-fi'), 'science fiction -> sci-fi');
  assert.ok(tokens.has('series'), 'show -> series');
  assert.ok(!tokens.has('recommend'), 'stop word removed');
});

test('detectDecade parses era phrases', () => {
  assert.strictEqual(detectDecade('an intense 90s thriller'), 1990);
  assert.strictEqual(detectDecade('something from the eighties'), 1980);
  assert.strictEqual(detectDecade('a modern comedy'), null);
});

test('recommend returns genre-relevant results ranked by score', () => {
  const results = recommend('a relaxing nature documentary');
  assert.ok(results.length > 0, 'has results');
  assert.strictEqual(results[0].id, 'planet-earth', 'documentary tops the list');
  assert.ok(results[0].score > 0, 'top result has positive score');
});

test('recommend respects the decade filter', () => {
  const results = recommend('intense sci-fi from the 90s');
  const top = results[0];
  assert.ok(top.year >= 1990 && top.year < 2000, `expected a 90s title, got ${top.year}`);
});

test('recommend respects the limit option', () => {
  const results = recommend('a fun adventure', { limit: 2 });
  assert.strictEqual(results.length, 2);
});

test('recommend falls back to staples when nothing matches', () => {
  const results = recommend('zzzz nonsense query xyzzy');
  assert.ok(results.length > 0, 'fallback returns staples');
});

test('buildSpokenResponse names the top pick', () => {
  const results = recommend('a heartwarming animated movie');
  const spoken = buildSpokenResponse('a heartwarming animated movie', results);
  assert.ok(spoken.includes(results[0].title), 'spoken text names the top recommendation');
});
