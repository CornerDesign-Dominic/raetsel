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
  <section class="arrow-board" aria-label="Pfeilfolge spielen">
    <div class="arrow-toolbar">
      <dl class="arrow-stats">
        <div><dt>Stufe</dt><dd data-arrow-level></dd></div>
        <div><dt>Pfeile</dt><dd data-arrow-length></dd></div>
        <div><dt>Wiederholungen</dt><dd data-arrow-retries></dd></div>
      </dl>
      <button type="button" class="icon-button arrow-restart" data-arrow-restart
        aria-label="Durchlauf neu starten" title="Durchlauf neu starten" disabled>
        <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
      </button>
    </div>
    <div class="arrow-stage" data-arrow-stage>
      <h3 data-arrow-phase></h3>
      <div class="arrow-display" aria-hidden="true">
        <span data-arrow-symbol></span>
        <span data-arrow-step></span>
      </div>
      <progress class="arrow-progress" aria-hidden="true" data-arrow-progress hidden></progress>
      <p class="arrow-message" data-arrow-message role="status" tabindex="-1"></p>
    </div>
    <p class="arrow-cue" data-arrow-cue aria-live="polite"></p>
    <div class="arrow-actions">
      <button type="button" data-arrow-continue></button>
    </div>
    <div class="arrow-pad" data-arrow-pad role="group" aria-label="Richtung wählen"></div>
  </section>
`;

const length = game.querySelector('[data-arrow-length]');
const retries = game.querySelector('[data-arrow-retries]');
const stage = game.querySelector('[data-arrow-stage]');
const phaseHeading = game.querySelector('[data-arrow-phase]');
const progress = game.querySelector('[data-arrow-progress]');
const levelLabel = game.querySelector('[data-arrow-level]');
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

function setPhase(value, heading, text, action = '') {
  phase = value;
  message.textContent = text;
  stage.dataset.phase = phase;
  phaseHeading.textContent = heading;
  progress.hidden = phase !== 'watch' && phase !== 'input';
  progress.max = sequence.length;
  progress.value = 0;
  length.textContent = sequence.length;
  retries.textContent = retriesLeft;
  next.textContent = action;
  next.hidden = !action;
  restart.disabled = phase === 'idle' || phase === 'ended';
  for (const button of directionButtons) button.disabled = phase !== 'input';
}

function resetRun() {
  clearTimer();
  sequence = Array.from({ length: initialLength }, randomDirection);
  entered = 0;
  retriesLeft = initialRetries;
  cue.textContent = '';
  symbol.textContent = '↔';
  step.textContent = '';
  setPhase('idle', 'Bereit?', 'Merke dir die Pfeile und tippe danach die Richtungen in derselben Reihenfolge.', 'Folge starten');
}

function showCue(index) {
  const direction = directions[sequence[index]];
  symbol.textContent = direction.symbol;
  step.textContent = (index + 1) + ' / ' + sequence.length;
  progress.value = index + 1;
  cue.textContent = 'Pfeil ' + (index + 1) + ': ' + direction.label;

  timer = window.setTimeout(() => {
    symbol.textContent = '·';
    if (index + 1 < sequence.length) {
      timer = window.setTimeout(() => showCue(index + 1), cueGap);
    } else {
      cue.textContent = '';
      step.textContent = '';
      symbol.textContent = '0 / ' + sequence.length;
      setPhase('input', 'Deine Eingabe', 'Jetzt bist du dran. Tippe die Pfeile in der gemerkten Reihenfolge.');
      directionButtons[0].focus({ preventScroll: true });
    }
  }, cueDuration);
}

function playSequence() {
  clearTimer();
  entered = 0;
  symbol.textContent = '·';
  step.textContent = '';
  setPhase('watch', 'Merken', 'Schau auf die Pfeile.');
  message.focus({ preventScroll: true });
  timer = window.setTimeout(() => showCue(0), cueGap);
}

function enterDirection(direction) {
  if (phase !== 'input') return;
  if (direction !== sequence[entered]) {
    step.textContent = '';
    cue.textContent = '';
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      symbol.textContent = '↻';
      const retryMessage = retriesLeft === 0
        ? 'Du kannst dir die Folge ein letztes Mal ansehen.'
        : 'Du kannst dir dieselbe Folge noch einmal ansehen.';
      setPhase('retry', 'Falsche Richtung', retryMessage, 'Folge wiederholen');
    } else {
      const best = sequence.length > initialLength ? sequence.length - 1 : 0;
      symbol.textContent = best;
      setPhase('ended', 'Durchlauf beendet', 'Längste gelöste Folge: ' + best + ' Pfeile.', 'Neuer Durchlauf');
    }
    next.focus({ preventScroll: true });
    return;
  }

  entered += 1;
  symbol.textContent = entered + ' / ' + sequence.length;
  progress.value = entered;
  cue.textContent = entered + ' von ' + sequence.length + ' Pfeilen richtig.';
  if (entered !== sequence.length) return;

  if (sequence.length === initialLength) markSolved(gameId, level);
  const completedLength = sequence.length;
  sequence.push(randomDirection());
  cue.textContent = '';
  symbol.textContent = '✓';
  step.textContent = '';
  setPhase('next', 'Richtig!', completedLength + ' Pfeile richtig. Jetzt kommt einer dazu.', 'Nächste Folge');
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
  levelLabel.textContent = levels[level];
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

games.set(gameId, { title: 'Pfeilfolge', category: 'training', load, leave });
