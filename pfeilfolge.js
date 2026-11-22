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
    <div class="arrow-stage" data-arrow-stage tabindex="-1">
      <span class="arrow-symbol" data-arrow-symbol aria-hidden="true"></span>
      <button type="button" class="arrow-stage-action" data-arrow-continue>
        <strong data-arrow-title></strong>
        <span data-arrow-prompt></span>
      </button>
      <div class="arrow-trail" data-arrow-trail aria-hidden="true">
        <div class="arrow-trail-items" data-arrow-items></div>
      </div>
    </div>
    <p class="arrow-cue" data-arrow-cue aria-live="polite"></p>
    <div class="arrow-pad" data-arrow-pad role="group" aria-label="Richtung wählen"></div>
  </section>
  <dialog class="result-dialog" id="arrow-restart-dialog"
    aria-labelledby="arrow-restart-title" aria-describedby="arrow-restart-description">
    <h2 id="arrow-restart-title">Durchlauf neu starten?</h2>
    <p id="arrow-restart-description">Dein Fortschritt in diesem Durchlauf geht verloren.</p>
    <form method="dialog" class="puzzle-actions">
      <button type="submit" class="secondary-action" autofocus>Abbrechen</button>
      <button type="button" data-arrow-confirm-restart>Neu starten</button>
    </form>
  </dialog>
`;

const length = game.querySelector('[data-arrow-length]');
const retries = game.querySelector('[data-arrow-retries]');
const stage = game.querySelector('[data-arrow-stage]');
const title = game.querySelector('[data-arrow-title]');
const prompt = game.querySelector('[data-arrow-prompt]');
const trail = game.querySelector('[data-arrow-trail]');
const items = game.querySelector('[data-arrow-items]');
const levelLabel = game.querySelector('[data-arrow-level]');
const symbol = game.querySelector('[data-arrow-symbol]');
const cue = game.querySelector('[data-arrow-cue]');
const pad = game.querySelector('[data-arrow-pad]');
const next = game.querySelector('[data-arrow-continue]');
const restart = game.querySelector('[data-arrow-restart]');
const restartDialog = game.querySelector('#arrow-restart-dialog');
const confirmRestart = game.querySelector('[data-arrow-confirm-restart]');

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

function setPhase(value, heading = '', instruction = '') {
  phase = value;
  game.dataset.arrowPhase = phase;
  stage.dataset.phase = phase;
  title.textContent = heading;
  title.hidden = !heading;
  prompt.textContent = instruction;
  next.hidden = !instruction;
  symbol.hidden = phase !== 'watch';
  length.textContent = sequence.length;
  retries.textContent = retriesLeft;
  restart.disabled = phase === 'idle' || phase === 'ended';
  for (const button of directionButtons) button.disabled = phase !== 'input';
}

function resetRun() {
  clearTimer();
  sequence = Array.from({ length: initialLength }, randomDirection);
  entered = 0;
  cue.textContent = '';
  retriesLeft = initialRetries;
  items.replaceChildren();
  setPhase('idle', '', 'Tippen, um zu beginnen');
}

function showCue(index) {
  const direction = directions[sequence[index]];
  symbol.textContent = direction.symbol;
  const dot = document.createElement('span');
  dot.className = 'arrow-trail-token';
  dot.textContent = '·';
  items.append(dot);
  trail.scrollLeft = trail.scrollWidth;
  cue.textContent = 'Pfeil ' + (index + 1) + ': ' + direction.label;

  timer = window.setTimeout(() => {
    symbol.textContent = '';
    if (index + 1 < sequence.length) {
      timer = window.setTimeout(() => showCue(index + 1), cueGap);
    } else {
      trail.scrollLeft = 0;
      setPhase('input');
      cue.textContent = 'Jetzt die Pfeilfolge eingeben.';
      directionButtons[0].focus({ preventScroll: true });
    }
  }, cueDuration);
}

function playSequence() {
  clearTimer();
  entered = 0;
  symbol.textContent = '';
  cue.textContent = '';
  items.replaceChildren();
  setPhase('watch');
  stage.focus({ preventScroll: true });
  timer = window.setTimeout(() => showCue(0), cueGap);
}

function enterDirection(direction) {
  if (phase !== 'input') return;
  const correct = direction === sequence[entered];
  const token = items.children[entered];
  token.textContent = directions[direction].symbol;
  token.dataset.result = correct ? 'correct' : 'wrong';
  trail.scrollLeft = Math.max(0, token.offsetLeft + token.offsetWidth - trail.clientWidth);

  if (!correct) {
    cue.textContent = directions[direction].label + ': falsch.';
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      setPhase('retry', 'Oh nein, versuch es noch mal.', 'Tippen, um zu starten');
    } else {
      setPhase('ended', 'Oh nein, versuch es noch mal.', 'Tippen für einen neuen Durchlauf');
    }
    next.focus({ preventScroll: true });
    return;
  }

  entered += 1;
  cue.textContent = entered + ' von ' + sequence.length + ' Pfeilen richtig.';
  if (entered !== sequence.length) return;

  if (sequence.length === initialLength) markSolved(gameId, level);
  setPhase('next', 'Sehr gut. Weiter!', 'Tippen, um zu starten');
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
  if (restartDialog.open) restartDialog.close();
  clearTimer();
  phase = 'idle';
  cue.textContent = '';
}

next.addEventListener('click', () => {
  if (phase === 'watch' || phase === 'input') return;
  if (phase === 'ended') resetRun();
  if (phase === 'next') sequence.push(randomDirection());
  playSequence();
});

restart.addEventListener('click', () => {
  if (!restartDialog.open) restartDialog.showModal();
});

confirmRestart.addEventListener('click', () => {
  restartDialog.close();
  resetRun();
  next.focus({ preventScroll: true });
});

game.addEventListener('keydown', (event) => {
  if (restartDialog.open) return;
  if (phase !== 'input' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const direction = keyDirections[event.code] ?? keyDirections[event.key];
  if (!choices[level].includes(direction)) return;
  event.preventDefault();
  enterDirection(direction);
});

games.set(gameId, { title: 'Pfeilfolge', category: 'training', load, leave });
