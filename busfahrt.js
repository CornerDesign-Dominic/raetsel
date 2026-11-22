import { games, levels, markSolved } from './puzzle-levels.js';

const game = 'busfahrt';
const firstStopCount = 3;
const passengerInterval = 115;
const passengerTravel = 420;
const settings = {
  leicht: { capacity: 10, boarding: [2, 6], maxAlighting: 3 },
  mittel: { capacity: 20, boarding: [3, 10], maxAlighting: 5 },
  schwer: { capacity: 30, boarding: [5, 15], maxAlighting: 8 },
};

const stage = document.querySelector('#bus-game');
stage.innerHTML = `
  <section class="board bus-board" aria-label="Busfahrt">
    <div class="bus-progress">
      <p id="bus-level"></p>
      <p id="bus-stop-display"></p>
    </div>
    <div class="bus-scene" id="bus-scene" data-motion="parked" aria-hidden="true">
      <div class="bus-platform">
        <div class="bus-vehicle">
          <div class="bus-windows"><i></i><i></i><i></i><i></i></div>
          <span class="bus-door"></span>
          <span class="bus-headlight"></span>
          <span class="bus-wheel"></span><span class="bus-wheel bus-wheel-front"></span>
        </div>
        <div class="bus-stop-sign"></div>
      </div>
      <div class="bus-pavement">
        <div id="bus-people" class="bus-people"></div>
      </div>
    </div>
    <p id="bus-cue" class="bus-cue" tabindex="-1"></p>
    <p id="bus-status" class="bus-status" role="status" aria-atomic="true"></p>
    <div class="bus-actions" id="bus-ready">
      <button type="button" id="bus-start">Fahrt starten</button>
    </div>
    <form id="bus-answer" class="bus-answer" hidden>
      <label for="bus-count">Wie viele Fahrgäste sind noch im Bus?</label>
      <div class="bus-input-row">
        <input id="bus-count" type="text" inputmode="numeric" autocomplete="off" aria-describedby="bus-error">
        <button type="submit">Lösen</button>
      </div>
      <p id="bus-error" role="status"></p>
    </form>
    <div class="bus-actions" id="bus-next" hidden>
      <button type="button" id="bus-continue">Nächste Fahrt</button>
    </div>
  </section>
`;

const levelDisplay = stage.querySelector('#bus-level');
const stopDisplay = stage.querySelector('#bus-stop-display');
const scene = stage.querySelector('#bus-scene');
const people = stage.querySelector('#bus-people');
const door = stage.querySelector('.bus-door');
const cue = stage.querySelector('#bus-cue');
const status = stage.querySelector('#bus-status');
const readyActions = stage.querySelector('#bus-ready');
const form = stage.querySelector('#bus-answer');
const answer = stage.querySelector('#bus-count');
const error = stage.querySelector('#bus-error');
const nextActions = stage.querySelector('#bus-next');
const continueButton = stage.querySelector('#bus-continue');

let currentLevel;
let nextStops = firstStopCount;
let trip;
let stopIndex = 0;
let phase = 'ready';
let timer;

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createTrip(stopCount, { capacity, boarding, maxAlighting }) {
  let riders = 0;
  const stops = [];
  for (let index = 0; index < stopCount; index++) {
    const minAlighting = index === 1 || riders === capacity ? 1 : 0;
    const off = randomInt(minAlighting, Math.min(riders, maxAlighting));
    const room = capacity - riders + off;
    const on = randomInt(off === 0 ? Math.min(room, boarding[0]) : 0, Math.min(room, boarding[1]));
    riders += on - off;
    stops.push({ on, off });
  }
  return { stops, riders };
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
  readyActions.hidden = phase !== 'ready';
  form.hidden = phase !== 'answer';
  nextActions.hidden = phase !== 'result';
}

function drawPeople(count, direction, previewTime) {
  scene.dataset.motion = 'parked';
  const passengers = Array.from({ length: count }, (_, index) => {
    const passenger = document.createElement('span');
    passenger.className = 'bus-passenger';
    passenger.style.setProperty('--bus-delay', previewTime + index * passengerInterval + 'ms');
    return passenger;
  });
  people.replaceChildren(...passengers);

  const doorway = door.getBoundingClientRect();
  const scale = doorway.width / door.offsetWidth || 1;
  const positions = passengers.map((passenger) => passenger.getBoundingClientRect());
  for (const [index, passenger] of passengers.entries()) {
    const position = positions[index];
    passenger.style.setProperty('--bus-door-x', (doorway.left + (doorway.width - position.width) / 2 - position.left) / scale + 'px');
    passenger.style.setProperty('--bus-door-y', (doorway.bottom - position.bottom) / scale + 'px');
  }
  scene.dataset.motion = direction;
}

function showFlow(count, direction, after) {
  if (count === 0) {
    after();
    return;
  }

  const boarding = direction === 'boarding';
  const verb = boarding ? 'ein' : 'aus';
  describe(
    boarding ? '↑ Einsteigen' : '↓ Aussteigen',
    'Haltestelle ' + (stopIndex + 1) + ': ' + count +
      (count === 1 ? ' Fahrgast steigt ' : ' Fahrgäste steigen ') + verb + '.',
  );

  const countTime = 850 + count * 55;
  drawPeople(count, direction, boarding ? countTime : 0);
  wait(after, countTime + (count - 1) * passengerInterval + passengerTravel + 160);
}

function askForAnswer() {
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  describe('Endhaltestelle');
  showPhase('answer');
  answer.focus({ preventScroll: true });
}

function advanceToStop() {
  if (stopIndex === trip.stops.length) {
    askForAnswer();
    return;
  }

  const number = stopIndex + 1;
  const stop = trip.stops[stopIndex];
  scene.dataset.motion = 'driving';
  people.replaceChildren();
  stopDisplay.textContent = 'Haltestelle ' + number + ' von ' + trip.stops.length;
  describe('Unterwegs zur Haltestelle ' + number + ' …');
  const travelTime = Math.max(380, 1250 - Math.floor(stopIndex / 2) * 135);
  wait(() => {
    showFlow(stop.off, 'alighting', () => {
      showFlow(stop.on, 'boarding', () => {
        stopIndex++;
        advanceToStop();
      });
    });
  }, travelTime);
}

function playTrip() {
  stopTimer();
  showPhase('play');
  answer.value = '';
  answer.removeAttribute('aria-invalid');
  error.textContent = '';
  trip = createTrip(nextStops, settings[currentLevel]);
  stopIndex = 0;
  stopDisplay.textContent = trip.stops.length + ' Haltestellen';
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  describe('Der Bus startet leer.');
  cue.focus({ preventScroll: true });
  wait(advanceToStop, 900);
}

function load(level) {
  stopTimer();
  currentLevel = level;
  nextStops = firstStopCount;
  trip = null;
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  levelDisplay.textContent = levels[level] + ' · maximal ' + settings[level].capacity + ' im Bus';
  stopDisplay.textContent = firstStopCount + ' Haltestellen';
  describe('Der Bus startet leer. Merke dir, wie viele Menschen ein- und aussteigen.');
  showPhase('ready');
}

function leave() {
  stopTimer();
  scene.dataset.motion = 'parked';
  people.replaceChildren();
  showPhase('ready');
}

stage.querySelector('#bus-start').addEventListener('click', () => playTrip());
continueButton.addEventListener('click', () => playTrip());

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

  const correct = Number(response) === trip.riders;
  nextStops = Math.max(firstStopCount, trip.stops.length + (correct ? 1 : -1));
  if (correct) markSolved(game, currentLevel);
  const remaining = trip.riders === 1 ? '1 Fahrgast' : trip.riders + ' Fahrgäste';
  describe((correct ? 'Richtig! ' : 'Knapp daneben. ') + 'Im Bus: ' + remaining + '. Nächste Fahrt: ' + nextStops + ' Haltestellen.');
  showPhase('result');
  continueButton.focus({ preventScroll: true });
});

games.set(game, { title: 'Busfahrt', category: 'zahlen-und-muster', load, leave });
