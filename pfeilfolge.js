import { games, levels, markSolved } from './puzzle-levels.js';

const gameId = 'pfeilfolge';
const directions = {
  links: { symbol: '←', label: 'Links' },
  rechts: { symbol: '→', label: 'Rechts' },
  oben: { symbol: '↑', label: 'Oben' },
  unten: { symbol: '↓', label: 'Unten' },
  'oben-links': { symbol: '↖', label: 'Oben links' },
  'oben-rechts': { symbol: '↗', label: 'Oben rechts' },
  'unten-links': { symbol: '↙', label: 'Unten links' },
  'unten-rechts': { symbol: '↘', label: 'Unten rechts' },
};
const choices = {
  leicht: ['links', 'rechts'],
  mittel: ['oben', 'links', 'rechts', 'unten'],
  schwer: ['oben-links', 'oben', 'oben-rechts', 'links', 'rechts', 'unten-links', 'unten', 'unten-rechts'],
};
const keyDirections = {
  ArrowLeft: 'links',
  ArrowRight: 'rechts',
  ArrowUp: 'oben',
  ArrowDown: 'unten',
  Numpad1: 'unten-links',
  Numpad2: 'unten',
  Numpad3: 'unten-rechts',
  Numpad4: 'links',
  Numpad6: 'rechts',
  Numpad7: 'oben-links',
  Numpad8: 'oben',
  Numpad9: 'oben-rechts',
};
const initialLength = 3;
const initialRetries = 2;
const cueDuration = 950;
const cueGap = 300;

const game = document.querySelector('#arrow-game');
game.innerHTML = `
  <section class="board arrow-board" aria-label="Pfeilfolge spielen">
    <dl class="arrow-stats">
      <div><dt>Folgenlänge</dt><dd data-arrow-length></dd></div>
      <div><dt>Wiederholungen übrig</dt><dd data-arrow-retries></dd></div>
    </dl>
    <div class="arrow-stage" data-arrow-stage aria-hidden="true">
      <span data-arrow-symbol>·</span>
      <span data-arrow-step></span>
    </div>
    <p class="arrow-cue" data-arrow-cue aria-live="polite"></p>
    <p class="arrow-message" data-arrow-message role="status" tabindex="-1"></p>
    <div class="arrow-pad" data-arrow-pad role="group" aria-label="Richtung wählen"></div>
    <div class="arrow-actions">
      <button type="button" data-arrow-continue></button>
      <button type="button" class="secondary-action" data-arrow-restart hidden>Neu starten</button>
    </div>
  </section>
`;

const length = game.querySelector('[data-arrow-length]');
const retries = game.querySelector('[data-arrow-retries]');
const stage = game.querySelector('[data-arrow-stage]');
const symbol = game.querySelector('[data-arrow-symbol]');
const step = game.querySelector('[data-arrow-step]');
const cue = game.querySelector('[data-arrow-cue]');
const message = game.querySelector('[data-arrow-message]');
const pad = game.querySelector('[data-arrow-pad]');
const next = game.querySelector('[data-arrow-continue]');
const restart = game.querySelector('[data-arrow-restart]');

let level;
let sequence = [];
let entered = 0;
let retriesLeft = initialRetries;
let phase = 'idle';
let timer;
let directionButtons = [];

function randomDirection() {
  const available = choices[level];
  return available[Math.floor(Math.random() * available.length)];
}

function clearTimer() {
  window.clearTimeout(timer);
  timer = undefined;
}

function setPhase(value, text, action = '') {
  phase = value;
  message.textContent = text;
  stage.dataset.phase = phase;
  length.textContent = sequence.length;
  retries.textContent = retriesLeft;
  next.textContent = action;
  next.hidden = !action;
  restart.hidden = phase === 'idle' || phase === 'ended';
  for (const button of directionButtons) button.disabled = phase !== 'input';
}

function resetRun() {
  clearTimer();
  sequence = Array.from({ length: initialLength }, randomDirection);
  entered = 0;
  retriesLeft = initialRetries;
  cue.textContent = '';
  symbol.textContent = '·';
  step.textContent = '';
  setPhase('idle', 'Schau dir die Pfeile an und tippe sie danach in derselben Reihenfolge.', 'Folge starten');
}

function showCue(index) {
  const direction = directions[sequence[index]];
  symbol.textContent = direction.symbol;
  step.textContent = (index + 1) + ' von ' + sequence.length;
  cue.textContent = 'Pfeil ' + (index + 1) + ': ' + direction.label;

  timer = window.setTimeout(() => {
    symbol.textContent = '·';
    if (index + 1 < sequence.length) {
      timer = window.setTimeout(() => showCue(index + 1), cueGap);
    } else {
      cue.textContent = '';
      step.textContent = '0 von ' + sequence.length;
      setPhase('input', 'Jetzt bist du dran. Gib die Pfeilfolge ein.');
      directionButtons[0].focus({ preventScroll: true });
    }
  }, cueDuration);
}

function playSequence() {
  clearTimer();
  entered = 0;
  symbol.textContent = '·';
  step.textContent = '';
  setPhase('watch', 'Merk dir die Pfeile.');
  message.focus({ preventScroll: true });
  timer = window.setTimeout(() => showCue(0), cueGap);
}

function enterDirection(direction) {
  if (phase !== 'input') return;
  if (direction !== sequence[entered]) {
    symbol.textContent = '·';
    step.textContent = '';
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      setPhase('retry', 'Dieser Pfeil passt nicht. Schau dir dieselbe Folge noch einmal an.', 'Folge wiederholen');
    } else {
      const result = sequence.length === initialLength
        ? 'Du kannst einen neuen Durchlauf mit drei Pfeilen beginnen.'
        : 'Deine längste richtige Folge hatte ' + (sequence.length - 1) + ' Pfeile.';
      setPhase('ended', 'Durchlauf beendet. ' + result, 'Neuer Durchlauf');
    }
    next.focus({ preventScroll: true });
    return;
  }

  entered += 1;
  step.textContent = entered + ' von ' + sequence.length;
  cue.textContent = entered + ' von ' + sequence.length + ' Pfeilen richtig.';
  if (entered !== sequence.length) return;

  if (sequence.length === initialLength) markSolved(gameId, level);
  const completedLength = sequence.length;
  sequence.push(randomDirection());
  cue.textContent = '';
  symbol.textContent = '✓';
  step.textContent = '';
  setPhase('next', completedLength + ' Pfeile richtig. Die nächste Folge hat einen Pfeil mehr.', 'Nächste Folge');
  next.focus({ preventScroll: true });
}

function load(selectedLevel) {
  level = selectedLevel;
  pad.dataset.level = level;
  directionButtons = choices[level].map((direction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.direction = direction;
    button.textContent = directions[direction].symbol;
    button.setAttribute('aria-label', directions[direction].label);
    button.addEventListener('click', () => enterDirection(direction));
    return button;
  });
  pad.replaceChildren(...directionButtons);
  const levelLabel = document.querySelector('#arrow-level');
  if (levelLabel) levelLabel.textContent = levels[level];
  resetRun();
}

function leave() {
  clearTimer();
  phase = 'idle';
  cue.textContent = '';
}

next.addEventListener('click', () => {
  if (phase === 'ended') resetRun();
  playSequence();
});

restart.addEventListener('click', () => {
  resetRun();
  next.focus({ preventScroll: true });
});

game.addEventListener('keydown', (event) => {
  if (phase !== 'input' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const direction = keyDirections[event.code] ?? keyDirections[event.key];
  if (!choices[level].includes(direction)) return;
  event.preventDefault();
  enterDirection(direction);
});

games.set(gameId, { title: 'Pfeilfolge', category: 'gedaechtnis', load, leave });
