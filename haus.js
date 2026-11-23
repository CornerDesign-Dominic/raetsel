import { games, markSolved } from './puzzle-levels.js';
import { mountNumberPad } from './number-pad.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const game = 'haus';
const firstWaveCount = 3;
const personInterval = 115;
const personTravel = 420;
const settings = {
  leicht: { capacity: 10, entering: [2, 6], maxAlighting: 3 },
  mittel: { capacity: 20, entering: [3, 10], maxAlighting: 5 },
  schwer: { capacity: 30, entering: [5, 15], maxAlighting: 8 },
};

const stage = document.querySelector('#house-game');
stage.innerHTML = `
  <div class="training-toolbar"><p class="training-progress" id="house-wave-display"></p></div>
  <form id="house-answer" class="training-board number-training-form">
    <div class="training-stage house-stage">
      <div class="house-scene" id="house-scene" data-motion="parked" aria-hidden="true">
        <div class="house-platform">
          <div class="house-building">
            <div class="house-roof"></div>
            <div class="house-facade">
              <i class="house-window"></i><span class="house-door"></span><i class="house-window"></i>
            </div>
          </div>
        </div>
        <div class="house-pavement">
          <div id="house-people" class="house-people"></div>
        </div>
      </div>
      <p id="house-cue" class="house-cue" tabindex="-1"></p>
      <p id="house-status" class="house-status" role="status" aria-atomic="true"></p>
      <div class="house-question" hidden>
        <label for="house-count">Wie viele Personen sind noch im Haus?</label>
        <input id="house-count" type="text" inputmode="none" autocomplete="off" maxlength="2" placeholder="?"
          aria-describedby="house-error">
        <p id="house-error" role="status"></p>
      </div>
    </div>
    <fieldset class="training-controls" aria-label="Nummernblock" hidden disabled>
      <button class="number-training-submit" type="submit" disabled>Abgeben</button>
      <div class="training-pad"></div>
    </fieldset>
  </form>
`;

const waveDisplay = stage.querySelector('#house-wave-display');
const scene = stage.querySelector('#house-scene');
const people = stage.querySelector('#house-people');
const door = stage.querySelector('.house-door');
const cue = stage.querySelector('#house-cue');
const status = stage.querySelector('#house-status');
const form = stage.querySelector('#house-answer');
const answer = stage.querySelector('#house-count');
const error = stage.querySelector('#house-error');

const playArea = stage.querySelector('.house-stage');
const controls = form.querySelector('fieldset');
const submit = form.querySelector('[type=submit]');
const question = stage.querySelector('.house-question');
const go = addStageAction(playArea, playRound);
const session = mountTrainingSession(stage, {
  toolbar: stage.querySelector('.training-toolbar'), stage: playArea,
  reset: resetRun, restart: ready,
});
mountNumberPad(form.querySelector('.training-pad'), answer);

let currentLevel;
let nextWaves = firstWaveCount;
let round;
let waveIndex = 0;
let phase = 'ready';
let timer;

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createRound(waveCount, { capacity, entering, maxAlighting }) {
  let inside = 0;
  const waves = [];
  for (let index = 0; index < waveCount; index++) {
    const minAlighting = index === 1 || inside === capacity ? 1 : 0;
    const off = randomInt(minAlighting, Math.min(inside, maxAlighting));
    const room = capacity - inside + off;
    const on = randomInt(off === 0 ? Math.min(room, entering[0]) : 0, Math.min(room, entering[1]));
    inside += on - off;
    waves.push({ on, off });
  }
  return { waves, inside };
}

function stopTimer() {
  window.clearTimeout(timer);
}

function wait(callback, delay) {
  timer = window.setTimeout(callback, delay);
}

function describe(text, screenReader = text) {
  cue.textContent = text;
  status.textContent = screenReader;
}

function showPhase(nextPhase) {
  phase = nextPhase;
  go.hidden = phase !== 'ready';
  scene.hidden = cue.hidden = phase !== 'play';
  question.hidden = controls.hidden = controls.disabled = phase !== 'answer';
  session.setRunning(phase === 'play' || phase === 'answer');
}

function drawPeople(count, direction, previewTime) {
  scene.dataset.motion = 'parked';
  const figures = Array.from({ length: count }, (_, index) => {
    const figure = document.createElement('span');
    figure.className = 'house-figure';
    figure.style.setProperty('--house-delay', previewTime + index * personInterval + 'ms');
    return figure;
  });
  people.replaceChildren(...figures);

  const doorway = door.getBoundingClientRect();
  const scale = doorway.width / door.offsetWidth || 1;
  const positions = figures.map((figure) => figure.getBoundingClientRect());
  for (const [index, figure] of figures.entries()) {
    const position = positions[index];
    figure.style.setProperty('--house-door-x', (doorway.left + (doorway.width - position.width) / 2 - position.left) / scale + 'px');
    figure.style.setProperty('--house-door-y', (doorway.bottom - position.bottom) / scale + 'px');
  }
  scene.dataset.motion = direction;
}

function showFlow(count, direction, after) {
  if (count === 0) {
    after();
    return;
  }

  const entering = direction === 'entering';
  const destination = entering ? 'ins Haus' : 'aus dem Haus';
  describe(
    entering ? 'Gehen hinein ↑' : 'Kommen hinaus ↓',
    'Gruppe ' + (waveIndex + 1) + ': ' + count +
      (count === 1 ? ' Person geht ' : ' Personen gehen ') + destination + '.',
  );

  const countTime = 850 + count * 55;
  drawPeople(count, direction, entering ? countTime : 0);
  wait(after, countTime + (count - 1) * personInterval + personTravel + 160);
}

function askForAnswer() {
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  describe('Jetzt bist du dran.');
  showPhase('answer');
  answer.focus({ preventScroll: true });
}

function advanceWave() {
  if (waveIndex === round.waves.length) {
    askForAnswer();
    return;
  }

  const number = waveIndex + 1;
  const wave = round.waves[waveIndex];
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  waveDisplay.textContent = 'Gruppe ' + number + ' von ' + round.waves.length;
  describe('Die nächste Gruppe kommt …');
  const pauseTime = Math.max(380, 1250 - Math.floor(waveIndex / 2) * 135);
  wait(() => {
    showFlow(wave.off, 'leaving', () => {
      showFlow(wave.on, 'entering', () => {
        waveIndex++;
        advanceWave();
      });
    });
  }, pauseTime);
}

function playRound() {
  stopTimer();
  showPhase('play');
  answer.value = '';
  submit.disabled = true;
  answer.removeAttribute('aria-invalid');
  error.textContent = '';
  round = createRound(nextWaves, settings[currentLevel]);
  waveIndex = 0;
  waveDisplay.textContent = round.waves.length + ' Gruppen';
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  describe('Das Haus ist am Anfang leer.');
  cue.focus({ preventScroll: true });
  wait(advanceWave, 900);
}

function ready() {
  stopTimer();
  round = null;
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  waveDisplay.textContent = nextWaves + ' Gruppen';
  describe('');
  showPhase('ready');
}

function resetRun() {
  nextWaves = firstWaveCount;
  ready();
}

function load(level) {
  currentLevel = level;
  resetRun();
}

function leave() {
  stopTimer();
  people.replaceChildren();
  session.leave();
}

answer.addEventListener('input', () => {
  answer.value = answer.value.replace(/\D/g, '');
  submit.disabled = !answer.value;
  answer.removeAttribute('aria-invalid');
  error.textContent = '';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (phase !== 'answer') return;
  const response = answer.value.trim();
  if (!/^\d+$/.test(response)) {
    answer.setAttribute('aria-invalid', 'true');
    error.textContent = 'Gib eine ganze Zahl ein.';
    answer.focus({ preventScroll: true });
    return;
  }

  const correct = Number(response) === round.inside;
  nextWaves = Math.max(firstWaveCount, round.waves.length + (correct ? 1 : -1));
  if (correct) markSolved(game, currentLevel);
  showPhase('result');
  session.finish({
    detail: correct ? 'Richtig gezählt!' : 'Knapp daneben.',
    metrics: [['Deine Antwort', response], ['Im Haus', round.inside], ['Gruppen als Nächstes', nextWaves]],
  });
});

games.set(game, { title: 'Haus', category: 'training', load, leave });
