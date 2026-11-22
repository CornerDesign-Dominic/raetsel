export const levels = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
export const games = new Map();

const solvedKey = 'inveni:solved';
const draftPrefixes = ['inveni:logikgitter:', 'inveni:sudoku:'];
const difficulty = document.querySelector('#difficulty-dialog');
const scorePrefix = 'inveni:scores:';
const scoresInMemory = new Map();
const previous = difficulty.querySelector('#difficulty-previous');
const next = difficulty.querySelector('#difficulty-next');
const start = difficulty.querySelector('#difficulty-start');
const scoreSection = difficulty.querySelector('.difficulty-scores');
const scoreList = difficulty.querySelector('#difficulty-scores-list');
const scoreEmpty = difficulty.querySelector('#difficulty-scores-empty');
const reset = document.querySelector('#reset-dialog');
const resetStatus = document.querySelector('#reset-status');
let pendingGame = '';
let options = [];
let page = 0;
let swipeStart;

function readSolved() {
  try {
    const saved = JSON.parse(localStorage.getItem(solvedKey));
    return new Set(Array.isArray(saved) ? saved.map(entry =>
      typeof entry === 'string' && entry.startsWith('busfahrt/') ? 'haus/' + entry.slice('busfahrt/'.length) : entry) : []);
  } catch {
    return new Set();
  }
}

let solved = readSolved();

export function markSolved(game, level) {
  for (const entry of readSolved()) solved.add(entry);
  solved.add(game + '/' + level);
  try {
    localStorage.setItem(solvedKey, JSON.stringify([...solved]));
  } catch {
    // Completion can still be shown during the current session.
  }
}

function readScores(key, rules) {
  if (scoresInMemory.has(key)) return scoresInMemory.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved.filter(rules.valid) : [];
  } catch {
    return [];
  }
}

export function recordScore(gameId, level, result) {
  const game = games.get(gameId);
  const rules = game?.score;
  if (!rules || !Object.hasOwn(game.options ?? levels, level) || !rules.valid(result)) return;

  const key = scorePrefix + gameId + '/' + level;
  const best = [...readScores(key, rules), result].sort(rules.compare).slice(0, 5);
  try {
    localStorage.setItem(key, JSON.stringify(best));
    scoresInMemory.delete(key);
  } catch {
    scoresInMemory.set(key, best);
  }
}

function renderPage() {
  const [level, label] = options[page];
  const done = solved.has(pendingGame + '/' + level);
  difficulty.querySelector('#difficulty-level').textContent = label + (done ? ' ✓' : '');
  difficulty.querySelector('#difficulty-position').textContent = `${page + 1} von ${options.length}`;
  previous.setAttribute('aria-disabled', String(page === 0));
  next.setAttribute('aria-disabled', String(page === options.length - 1));
  start.setAttribute('aria-label', label + ' starten');

  const rules = games.get(pendingGame).score;
  scoreSection.hidden = !rules;
  if (!rules) return;

  const best = readScores(scorePrefix + pendingGame + '/' + level, rules);
  scoreEmpty.hidden = best.length > 0;
  scoreList.replaceChildren(...best.map((result) => {
    const item = document.createElement('li');
    item.textContent = rules.format(result, level);
    return item;
  }));
}

function turnPage(direction) {
  const target = page + direction;
  if (target < 0 || target >= options.length) return;
  page = target;
  renderPage();
}

previous.addEventListener('click', () => turnPage(-1));
next.addEventListener('click', () => turnPage(1));
start.addEventListener('click', () => {
  window.location.hash = pendingGame + '/' + options[page][0];
});
difficulty.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  turnPage(event.key === 'ArrowLeft' ? -1 : 1);
});

const pages = difficulty.querySelector('.difficulty-options');
pages.addEventListener('touchstart', (event) => {
  swipeStart = event.touches.length === 1 ? event.touches[0] : undefined;
}, { passive: true });
pages.addEventListener('touchend', (event) => {
  if (!swipeStart) return;
  const touch = [...event.changedTouches].find((point) => point.identifier === swipeStart.identifier);
  if (!touch) return;
  const dx = touch.clientX - swipeStart.clientX;
  const dy = touch.clientY - swipeStart.clientY;
  swipeStart = undefined;
  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    if (event.cancelable) event.preventDefault();
    turnPage(dx < 0 ? 1 : -1);
  }
}, { passive: false });
pages.addEventListener('touchcancel', () => { swipeStart = undefined; });

export function chooseDifficulty(gameId, game) {
  pendingGame = gameId;
  difficulty.querySelector('#difficulty-title').textContent = game.title;
  options = Object.entries(game.options ?? levels);
  page = 0;
  swipeStart = undefined;
  renderPage();
  if (!difficulty.open) difficulty.showModal();
}

export function closeDifficulty() {
  if (difficulty.open) difficulty.close();
}

function cancelDifficulty() {
  window.location.hash = games.get(pendingGame).category;
}

difficulty.querySelector('#cancel-difficulty').addEventListener('click', cancelDifficulty);
difficulty.addEventListener('cancel', (event) => {
  event.preventDefault();
  cancelDifficulty();
});

document.querySelector('#reset-progress').addEventListener('click', () => reset.showModal());
document.querySelector('#confirm-reset').addEventListener('click', () => {
  solved.clear();
  scoresInMemory.clear();
  try {
    localStorage.removeItem(solvedKey);
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if ([scorePrefix, ...draftPrefixes].some(prefix => key?.startsWith(prefix))) localStorage.removeItem(key);
    }
    resetStatus.textContent = 'Spielstand zurückgesetzt.';
  } catch {
    resetStatus.textContent = 'Der gespeicherte Spielstand konnte nicht gelöscht werden.';
  }
});
