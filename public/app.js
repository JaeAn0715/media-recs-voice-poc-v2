(function () {
  'use strict';

  const form = document.getElementById('query-form');
  const input = document.getElementById('query-input');
  const micButton = document.getElementById('mic-button');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const spokenEl = document.getElementById('spoken');
  const spokenTextEl = document.getElementById('spoken-text');
  const suggestions = document.getElementById('suggestions');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', Boolean(isError));
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      /* speech synthesis is best-effort */
    }
  }

  function renderResults(data) {
    resultsEl.innerHTML = '';

    if (data.spoken) {
      spokenEl.hidden = false;
      spokenTextEl.textContent = data.spoken;
    }

    if (!data.results || data.results.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No matches found. Try a different genre or mood.';
      resultsEl.appendChild(empty);
      return;
    }

    for (const item of data.results) {
      const card = document.createElement('article');
      card.className = 'card';

      const genres = item.genres
        .map((g) => `<span class="genre-tag">${g}</span>`)
        .join('');

      card.innerHTML = [
        '<div class="card-header">',
        `  <h3>${escapeHtml(item.title)}</h3>`,
        `  <span class="year">${item.year}</span>`,
        '</div>',
        `<span class="type-pill">${escapeHtml(item.type)}</span>`,
        `<div class="genres">${genres}</div>`,
        `<p class="reason">${escapeHtml(item.reason)}</p>`,
        `<p class="description">${escapeHtml(item.description)}</p>`,
      ].join('');

      resultsEl.appendChild(card);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function requestRecommendations(query) {
    setStatus('Finding recommendations…');
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      renderResults(data);
      setStatus(`Showing ${data.results.length} recommendation(s) for “${query}”.`);
      speak(data.spoken);
    } catch (err) {
      setStatus(err.message || 'Something went wrong.', true);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      setStatus('Tell me a genre, mood, or vibe first.', true);
      return;
    }
    requestRecommendations(query);
  });

  suggestions.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    requestRecommendations(chip.textContent);
  });

  function setupVoice() {
    if (!SpeechRecognition) {
      micButton.disabled = true;
      micButton.title = 'Voice input is not supported in this browser';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;
      setStatus(`Heard: “${transcript}”`);
      requestRecommendations(transcript);
    });

    recognition.addEventListener('error', (event) => {
      setStatus(`Voice error: ${event.error}. You can type instead.`, true);
      micButton.classList.remove('listening');
    });

    recognition.addEventListener('end', () => {
      micButton.classList.remove('listening');
    });

    micButton.addEventListener('click', () => {
      try {
        setStatus('Listening… speak now.');
        micButton.classList.add('listening');
        recognition.start();
      } catch (err) {
        micButton.classList.remove('listening');
      }
    });
  }

  setupVoice();
})();
