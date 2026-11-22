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
  <p class="training-prompt" id="merken-prompt" role="status"></p>
  <div class="memory-grid" id="merken-grid" role="group" aria-label="Zahlenfelder"></div>
  <button type="button" id="merken-next">Runde starten</button>
`;
const roundLabel = root.querySelector('#merken-round');
const prompt = root.querySelector('#merken-prompt');
const next = root.querySelector('#merken-next');
const tiles = Array.from({ length: 12 }, (_, index) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'memory-tile';
  tile.addEventListener('click', () => choose(index));
  return tile;
});
root.querySelector('#merken-grid').append(...tiles);

let level, round, score, phase, timer, sequence, position;

function setPhase(value, message, action = '') {
  phase = value;
  root.dataset.phase = value;
  prompt.textContent = message;
  next.textContent = action;
  next.hidden = !action;
}

function showRound() {
  roundLabel.textContent = `Runde ${round} von ${rounds} · ${score} richtig`;
}

function reset() {
  window.clearTimeout(timer);
  round = 1;
  score = 0;
  sequence = [];
  setPhase('ready', 'Merke dir die Zahlen und ihre Positionen.', 'Runde starten');
  showRound();
  render();
}

function render() {
  for (const [index, tile] of tiles.entries()) {
    const number = sequence.indexOf(index) + 1;
    const found = number && number <= position;
    tile.dataset.active = Boolean(number);
    tile.dataset.found = Boolean(found);
    tile.textContent = number && (phase === 'reveal' || found) ? number : '';
    tile.disabled = phase !== 'recall' || !number || Boolean(found);
    if (number) {
      tile.setAttribute('aria-label', `Feld ${index + 1}${tile.textContent ? ', Zahl ' + tile.textContent : ''}`);
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
  setPhase('reveal', 'Zahlen und Positionen merken');
  render();
  timer = window.setTimeout(() => {
    setPhase('recall', 'Tippe die Felder aufsteigend an. Beginne bei 1.');
    render();
    tiles.find(tile => !tile.disabled)?.focus({ preventScroll: true });
  }, preview);
}

function choose(index) {
  if (phase !== 'recall') return;
  if (sequence[position] === index) {
    position++;
    if (position < sequence.length) {
      render();
      tiles.slice(index + 1).concat(tiles).find(tile => !tile.disabled)?.focus({ preventScroll: true });
      return;
    }
    score++;
  }

  const correct = position === sequence.length;
  showRound();
  if (round === rounds) {
    if (score === rounds) markSolved('merken', level);
    setPhase('finished', `${score} von ${rounds} Folgen richtig.`, 'Noch einmal');
  } else {
    setPhase('result', correct ? 'Richtig!' : 'Die Reihenfolge hat nicht gestimmt.', 'Nächste Runde');
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
