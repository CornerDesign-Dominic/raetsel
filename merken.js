import { games, markSolved } from './puzzle-levels.js';

const settings = {
  leicht: { count: 3, preview: 3000 },
  mittel: { count: 4, preview: 2400 },
  schwer: { count: 5, preview: 1800 },
};
const rounds = 5;
const root = document.querySelector('#merken-game');
root.innerHTML = `
  <p class="training-round" id="merken-round"></p>
  <div class="memory-stage">
    <p class="memory-status" id="merken-prompt" role="status" tabindex="-1"></p>
    <div class="memory-grid" id="merken-grid" role="group" aria-label="Zahlenfelder"></div>
    <button type="button" class="memory-action" id="merken-next">
      <strong data-memory-result></strong>
      <span data-memory-action></span>
    </button>
  </div>
`;
const roundLabel = root.querySelector('#merken-round');
const prompt = root.querySelector('#merken-prompt');
const next = root.querySelector('#merken-next');
const resultLabel = next.querySelector('[data-memory-result]');
const actionLabel = next.querySelector('[data-memory-action]');
const tiles = Array.from({ length: 12 }, (_, index) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'memory-tile';
  tile.addEventListener('click', () => choose(index));
  return tile;
});
root.querySelector('#merken-grid').append(...tiles);

let level, round, score, phase, timer, sequence, position, wrongTile;

function setPhase(value, message, action = '') {
  phase = value;
  root.dataset.phase = value;
  prompt.textContent = message;
  resultLabel.textContent = action ? message : '';
  resultLabel.hidden = !resultLabel.textContent;
  actionLabel.textContent = action;
  next.hidden = !action;
  prompt.hidden = Boolean(action);
}

function showRound() {
  roundLabel.textContent = `Runde ${round} von ${rounds} · ${score} richtig`;
}

function reset() {
  window.clearTimeout(timer);
  round = 1;
  score = 0;
  sequence = [];
  position = 0;
  wrongTile = undefined;
  setPhase('ready', '', 'Tippen, um zu beginnen');
  showRound();
  render();
}

function render() {
  for (const [index, tile] of tiles.entries()) {
    const number = sequence.indexOf(index) + 1;
    const found = number > 0 && number <= position;
    const wrong = index === wrongTile;
    tile.dataset.active = Boolean(number);
    tile.dataset.found = found;
    tile.dataset.wrong = wrong;
    tile.textContent = wrong ? number + ' ×' : number && (phase === 'reveal' || found) ? number : '';
    tile.disabled = phase !== 'recall' || !number || found;
    if (number) {
      tile.setAttribute('aria-label', `Feld ${index + 1}${tile.textContent ? ', Zahl ' + number : ''}${wrong ? ', falsch' : found ? ', richtig' : ''}`);
    } else {
      tile.removeAttribute('aria-label');
    }
  }
}

function reveal() {
  const { count, preview } = settings[level];
  const free = tiles.map((_, index) => index);
  sequence = Array.from({ length: count + Math.floor((round - 1) / 2) }, () =>
    free.splice(Math.floor(Math.random() * free.length), 1)[0]);
  position = 0;
  wrongTile = undefined;
  setPhase('reveal', 'Merken');
  render();
  prompt.focus({ preventScroll: true });
  timer = window.setTimeout(() => {
    setPhase('recall', 'Nächste Zahl: 1');
    render();
    tiles.find(tile => !tile.disabled)?.focus({ preventScroll: true });
  }, preview);
}

function choose(index) {
  if (phase !== 'recall' || tiles[index].disabled) return;
  const correct = sequence[position] === index;
  if (correct) {
    position++;
    if (position < sequence.length) {
      prompt.textContent = `Nächste Zahl: ${position + 1}`;
      render();
      tiles.slice(index + 1).concat(tiles).find(tile => !tile.disabled)?.focus({ preventScroll: true });
      return;
    }
    score++;
  } else {
    wrongTile = index;
  }

  showRound();
  if (round === rounds) {
    if (score === rounds) markSolved('merken', level);
    setPhase('finished', `${score} von ${rounds} Folgen richtig.`, 'Tippen für einen neuen Durchlauf');
  } else {
    setPhase('result', correct ? 'Sehr gut. Weiter!' : 'Oh nein, das war das falsche Feld.', 'Tippen für die nächste Runde');
  }
  render();
  next.focus({ preventScroll: true });
}

next.addEventListener('click', () => {
  if (phase === 'finished') reset();
  else if (phase === 'result') round++;
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
  leave() { window.clearTimeout(timer); },
});
