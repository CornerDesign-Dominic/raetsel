import { games, markSolved } from './puzzle-levels.js';
import { mountLives, mountTrainingSession } from './training-session.js';

const settings = {
  leicht: { count: 3, preview: 3000 },
  mittel: { count: 4, preview: 2400 },
  schwer: { count: 5, preview: 1800 },
};
const rounds = 5;
const startingLives = 2;
const seconds = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTime = (ms) => seconds.format(ms / 1000) + ' s';

const root = document.querySelector('#merken-game');
root.innerHTML = `
  <div class="training-toolbar">
    <dl class="training-stats training-progress">
      <div><dt>Runde</dt><dd id="merken-round"></dd></div>
    </dl>
  </div>
  <div class="memory-stage">
    <div class="memory-status" id="merken-prompt" tabindex="-1">
      <span id="merken-clock-label"></span>
      <span id="merken-clock" role="timer"></span>
    </div>
    <div class="memory-grid" id="merken-grid" role="group" aria-label="Zahlenfelder"></div>
    <button type="button" class="memory-action training-ready" id="merken-next">
      <strong data-memory-result></strong>
      <span data-memory-action></span>
    </button>
  </div>
`;
const roundLabel = root.querySelector('#merken-round');
const renderLives = mountLives(root.querySelector('.training-stats'));
const prompt = root.querySelector('#merken-prompt');
const clockLabel = root.querySelector('#merken-clock-label');
const clock = root.querySelector('#merken-clock');
const grid = root.querySelector('#merken-grid');
const next = root.querySelector('#merken-next');
const resultLabel = next.querySelector('[data-memory-result]');
const actionLabel = next.querySelector('[data-memory-action]');
const tiles = Array.from({ length: 16 }, (_, index) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'memory-tile';
  tile.addEventListener('click', (event) => choose(index, event.detail === 0));
  return tile;
});
grid.append(...tiles);

const session = mountTrainingSession(root, {
  toolbar: root.querySelector('.training-toolbar'),
  stage: root.querySelector('.memory-stage'),
  reset,
});

let level, round, score, phase, frame, phaseStartedAt, roundTimes, sequence, position, wrongTile;
let lives;

function stopClock() {
  window.cancelAnimationFrame(frame);
}

function setPhase(value, message, action = '') {
  phase = value;
  root.dataset.phase = value;
  const timed = value === 'reveal' || value === 'recall';
  clockLabel.textContent = timed ? message : '';
  prompt.hidden = !timed;
  resultLabel.textContent = timed ? '' : message;
  resultLabel.hidden = !resultLabel.textContent;
  actionLabel.textContent = action;
  next.hidden = !action;
  session.setRunning(value !== 'ready' && value !== 'finished');
  grid.hidden = value === 'finished';
}

function showRound() {
  roundLabel.textContent = round + ' / ' + rounds;
}

function reset() {
  stopClock();
  round = 1;
  score = 0;
  lives = startingLives;
  renderLives(lives);
  roundTimes = [];
  sequence = [];
  position = 0;
  wrongTile = undefined;
  setPhase('ready', '', 'Tippe, um zu beginnen');
  showRound();
  render();
}

function render() {
  for (const [index, tile] of tiles.entries()) {
    const number = sequence.indexOf(index) + 1;
    const found = number > 0 && number <= position;
    const wrong = index === wrongTile;
    // Covered cards expose the same state whether they held a number or were empty.
    const faceUp = Boolean(number) && (phase === 'reveal' || found || wrong);
    tile.dataset.faceUp = faceUp;
    tile.dataset.found = found;
    tile.dataset.wrong = wrong;
    tile.textContent = wrong ? (number ? number + ' ×' : '×') : faceUp ? number : '';
    tile.disabled = phase !== 'recall' || found;
    tile.setAttribute('aria-label', `Feld ${index + 1}${faceUp ? ', Zahl ' + number : ''}${wrong ? ', falsch' : found ? ', richtig' : ''}`);
  }
}

function tick() {
  const elapsed = performance.now() - phaseStartedAt;
  if (phase === 'reveal') {
    const remaining = settings[level].preview - elapsed;
    if (remaining <= 0) {
      setPhase('recall', 'Aufdecken');
      render();
      phaseStartedAt = performance.now();
      clock.textContent = formatTime(0);
      prompt.focus({ preventScroll: true });
    } else {
      clock.textContent = formatTime(remaining);
    }
  } else if (phase === 'recall') {
    clock.textContent = formatTime(elapsed);
  }
  frame = window.requestAnimationFrame(tick);
}

function reveal() {
  const { count, preview } = settings[level];
  const free = tiles.map((_, index) => index);
  sequence = Array.from({ length: count + Math.floor((round - 1) / 2) }, () =>
    free.splice(Math.floor(Math.random() * free.length), 1)[0]);
  position = 0;
  wrongTile = undefined;
  setPhase('reveal', 'Merken');
  clock.textContent = formatTime(preview);
  render();
  prompt.focus({ preventScroll: true });
  phaseStartedAt = performance.now();
  frame = window.requestAnimationFrame(tick);
}

function choose(index, keyboard) {
  if (phase !== 'recall' || tiles[index].disabled) return;
  const correct = sequence[position] === index;
  const outOfLives = !correct && lives === 0;
  if (correct) {
    position++;
    if (position < sequence.length) {
      render();
      if (keyboard) {
        tiles.slice(index + 1).concat(tiles).find(tile => !tile.disabled)?.focus({ preventScroll: true });
      }
      return;
    }
    score++;
  } else {
    wrongTile = index;
    if (!outOfLives) lives--;
    renderLives(lives);
  }

  roundTimes.push(performance.now() - phaseStartedAt);
  stopClock();
  if (round === rounds || outOfLives) {
    if (score === rounds) markSolved('merken', level);
    setPhase('finished', '');
    const total = roundTimes.reduce((sum, duration) => sum + duration, 0);
    session.finish({
      stacked: true,
      detail: outOfLives ? 'Kein Fehlversuch übrig. Hier sind deine Aufdeckzeiten.' : 'Aufdeckzeiten pro Runde',
      metrics: [
        ['Richtig', score + ' / ' + roundTimes.length],
        ...roundTimes.map((duration, index) => ['Runde ' + (index + 1), formatTime(duration)]),
        ['Gesamt', formatTime(total)],
      ],
    });
  } else {
    setPhase('result', correct ? 'Sehr gut. Weiter!' : 'Oh nein, das war das falsche Feld.', 'Tippen für die nächste Runde');
    render();
    next.focus({ preventScroll: true });
  }
}

next.addEventListener('click', () => {
  if (phase === 'result') round++;
  showRound();
  reveal();
});

games.set('merken', {
  title: 'Merken',
  category: 'training',
  load(selectedLevel) {
    level = selectedLevel;
    reset();
  },
  leave() {
    stopClock();
    session.leave();
  },
});
