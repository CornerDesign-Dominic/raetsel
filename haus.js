import { games, markSolved } from './puzzle-levels.js';
import { mountNumberPad } from './number-pad.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const game = 'haus';
const firstWaveCount = 3;
const initialGroupDuration = 2400;
const minimumGroupDuration = 1450;
const durationReduction = 180;
const startingLives = 2;
const countdownSeconds = 3;
const settings = {
  leicht: { capacity: 15, entering: [2, 6], maxAlighting: 3 },
  mittel: { capacity: 25, entering: [3, 10], maxAlighting: 5 },
  schwer: { capacity: 35, entering: [5, 15], maxAlighting: 8 },
};

const stage = document.querySelector('#house-game');
stage.innerHTML = `
  <div class="training-toolbar">
    <dl class="training-stats training-progress">
      <div><dt>Gruppen</dt><dd id="house-wave-display"></dd></div>
      <div><dt>Leben</dt><dd id="house-lives"></dd></div>
    </dl>
  </div>
  <form id="house-answer" class="training-board number-training-form">
    <div class="training-stage house-stage" tabindex="-1">
      <div class="house-scene" id="house-scene" data-motion="parked" aria-hidden="true">
        <svg class="house-building" viewBox="0 0 80 88" preserveAspectRatio="xMidYMax meet" fill="none">
          <path class="house-outline" d="M9 87V33L40 4l31 29v54Z"/>
          <path class="house-door" d="M31 87V57h18v30Z"/>
        </svg>
        <div id="house-people" class="house-people"></div>
      </div>
      <p id="house-status" class="house-status" role="status" aria-atomic="true"></p>
      <div class="house-question" hidden>
        <label for="house-count">Wie viele Personen sind noch im Haus?</label>
        <input id="house-count" type="text" inputmode="none" autocomplete="off" maxlength="2" placeholder="?"
          aria-describedby="house-error">
        <p id="house-error" role="status"></p>
      </div>
      <div class="house-feedback" hidden>
        <strong id="house-round-result"></strong>
        <p id="house-round-detail"></p>
        <p aria-hidden="true">Nächste Runde in <strong id="house-countdown"></strong></p>
      </div>
    </div>
    <fieldset class="training-controls" aria-label="Nummernblock" disabled>
      <button class="number-training-submit" type="submit" disabled>Abgeben</button>
      <div class="training-pad"></div>
    </fieldset>
  </form>
`;

const waveDisplay = stage.querySelector('#house-wave-display');
const lifeDisplay = stage.querySelector('#house-lives');
const feedback = stage.querySelector('.house-feedback');
const roundResult = stage.querySelector('#house-round-result');
const roundDetail = stage.querySelector('#house-round-detail');
const countdown = stage.querySelector('#house-countdown');
const scene = stage.querySelector('#house-scene');
const people = stage.querySelector('#house-people');
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
  reset: resetRun,
});
mountNumberPad(form.querySelector('.training-pad'), answer);

let currentLevel;
let nextWaves;
let lives;
let roundsAnswered;
let correctRounds;
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

function showPhase(nextPhase) {
  phase = nextPhase;
  go.hidden = phase !== 'ready';
  scene.hidden = phase !== 'play';
  question.hidden = controls.disabled = answer.disabled = phase !== 'answer';
  feedback.hidden = phase !== 'feedback';
  session.setRunning(phase === 'play' || phase === 'answer' || phase === 'feedback');
}

const figureMarkup = `<svg viewBox="0 0 24 30" fill="currentColor">
  <circle cx="12" cy="5" r="4.5"/>
  <path d="M8 11h8a6 6 0 0 1 6 6v4h-4v6a3 3 0 0 1-6 0v-4h-1v4a3 3 0 0 1-6 0v-6H2v-4a6 6 0 0 1 6-6Z"/>
</svg>`;

function animationDuration(groupIndex) {
  const speedSteps = Math.floor(groupIndex / 2);
  return Math.max(minimumGroupDuration, initialGroupDuration - speedSteps * durationReduction);
}

function drawPeople(count, direction, duration) {
  scene.dataset.motion = direction;
  const group = document.createElement('div');
  group.className = 'house-group';
  group.style.setProperty('--house-group-duration', duration + 'ms');
  const figures = Array.from({ length: count }, () => {
    const figure = document.createElement('span');
    figure.className = 'house-figure';
    figure.innerHTML = figureMarkup;
    return figure;
  });
  group.append(...figures);
  people.replaceChildren(group);
}

function showFlow(count, direction, after) {
  if (count === 0) {
    after();
    return;
  }

  const entering = direction === 'entering';
  const destination = entering ? 'ins Haus' : 'aus dem Haus';
  status.textContent = 'Gruppe ' + (waveIndex + 1) + ': ' + count +
    (count === 1 ? ' Person geht ' : ' Personen gehen ') + destination + '.';

  const duration = animationDuration(waveIndex);
  drawPeople(count, direction, duration);
  wait(after, duration + 150);
}

function askForAnswer() {
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  status.textContent = 'Jetzt bist du dran.';
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
  waveDisplay.textContent = number + ' / ' + round.waves.length;
  status.textContent = 'Die nächste Gruppe kommt …';
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
  waveDisplay.textContent = '0 / ' + round.waves.length;
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  status.textContent = 'Das Haus ist am Anfang leer.';
  playArea.focus({ preventScroll: true });
  wait(advanceWave, 900);
}

function resetRun() {
  stopTimer();
  lives = startingLives;
  roundsAnswered = correctRounds = 0;
  nextWaves = firstWaveCount;
  round = null;
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  waveDisplay.textContent = '0 / ' + nextWaves;
  lifeDisplay.textContent = lives;
  status.textContent = '';
  showPhase('ready');
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

function showRoundFeedback(correct, detail) {
  const message = correct ? 'Richtig!' : 'Falsch';
  roundResult.textContent = message;
  roundDetail.textContent = detail;
  feedback.dataset.result = correct ? 'correct' : 'wrong';
  showPhase('feedback');
  status.textContent = message + ' ' + detail + ' Nächste Runde in drei Sekunden.';

  function tick(remaining) {
    countdown.textContent = remaining;
    wait(remaining === 1 ? playRound : () => tick(remaining - 1), 1000);
  }
  tick(countdownSeconds);
}

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
  roundsAnswered++;
  if (correct) correctRounds++;
  else lives--;
  lifeDisplay.textContent = lives;

  const detail = round.inside === 1 ? 'Im Haus war 1 Person.' : 'Im Haus waren ' + round.inside + ' Personen.';
  if (lives > 0) {
    showRoundFeedback(correct, detail);
    return;
  }

  if (correctRounds > 0) markSolved(game, currentLevel);
  showPhase('result');
  status.textContent = '';
  session.finish({
    detail: 'Beide Leben sind aufgebraucht. ' + detail,
    metrics: [['Richtig', correctRounds + ' / ' + roundsAnswered], ['Fehler', startingLives]],
  });
});

games.set(game, { title: 'Haus', category: 'training', load, leave });
