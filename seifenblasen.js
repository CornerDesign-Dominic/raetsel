import { games } from './puzzle-levels.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const bubbleCount = 6;
const movingCounts = { leicht: 0, mittel: 2, schwer: 5 };
const root = document.querySelector('#bubble-game');

root.innerHTML = `
  <div class="training-toolbar">
    <p class="training-progress">Nächste Zahl <strong id="bubble-next">1</strong></p>
  </div>
  <div class="training-stage bubble-stage">
    <div class="bubble-field" id="bubble-field" role="group" aria-label="Seifenblasen" hidden></div>
    <p class="bubble-feedback" id="bubble-feedback" role="status"></p>
  </div>
  <div class="training-stop-row">
    <button type="button" class="secondary-action" id="bubble-stop" hidden>Beenden</button>
  </div>
`;

const field = root.querySelector('#bubble-field');
const feedback = root.querySelector('#bubble-feedback');
const nextLabel = root.querySelector('#bubble-next');
const slots = Array.from({ length: 9 }, () => {
  const slot = document.createElement('div');
  slot.className = 'bubble-slot';
  return slot;
});
field.append(...slots);

let level;
let nextNumber;
let highestNumber;
let lastMiss;
let misses;
const stage = root.querySelector('.bubble-stage');
const stop = root.querySelector('#bubble-stop');
const go = addStageAction(stage, start);
const session = mountTrainingSession(root, {
  toolbar: root.querySelector('.training-toolbar'), stage, reset,
});
stop.addEventListener('click', () => {
  field.hidden = stop.hidden = true;
  feedback.textContent = '';
  session.finish({ metrics: [['Geplatzt', nextNumber - 1], ['Fehlversuche', misses]] });
});

function reset() {
  session.setRunning(false);
  field.hidden = stop.hidden = true;
  for (const slot of slots) slot.replaceChildren();
  nextLabel.textContent = '1';
  feedback.textContent = '';
  go.hidden = false;
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

function placeBubble(slot, number, moving) {
  const orbit = document.createElement('div');
  orbit.className = 'bubble-orbit';
  orbit.toggleAttribute('data-moving', moving);
  if (moving) orbit.style.setProperty('--bubble-delay', `-${Math.random() * 5}s`);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bubble';
  button.dataset.number = number;
  button.textContent = number;
  orbit.append(button);
  slot.replaceChildren(orbit);
  return button;
}

function start() {
  session.setRunning(true);
  go.hidden = true;
  field.hidden = stop.hidden = false;
  misses = 0;
  nextNumber = 1;
  highestNumber = bubbleCount;
  nextLabel.textContent = nextNumber;
  feedback.textContent = '';
  lastMiss = undefined;

  const free = [...slots];
  let movingLeft = movingCounts[level];
  for (let number = 1; number <= bubbleCount; number++) {
    const [slot] = free.splice(randomIndex(free.length), 1);
    const moving = randomIndex(bubbleCount - number + 1) < movingLeft;
    placeBubble(slot, number, moving);
    if (moving) movingLeft--;
  }
}

function burst(button) {
  const orbit = button.parentElement;
  const effect = document.createElement('span');
  effect.className = 'bubble-burst';
  effect.setAttribute('aria-hidden', 'true');
  effect.addEventListener('animationend', () => orbit.remove(), { once: true });
  button.replaceWith(effect);
}

field.addEventListener('click', (event) => {
  const button = event.target.closest('.bubble');
  if (field.hidden || !button) return;

  lastMiss?.classList.remove('is-missed');
  lastMiss = undefined;
  if (Number(button.dataset.number) !== nextNumber) {
    misses++;
    button.classList.add('is-missed');
    lastMiss = button;
    feedback.textContent = `Tippe auf die ${nextNumber}.`;
    return;
  }

  const free = slots.filter((slot) => !slot.querySelector('.bubble'));
  const moving = button.parentElement.hasAttribute('data-moving');
  burst(button);
  const replacement = placeBubble(free[randomIndex(free.length)], ++highestNumber, moving);
  nextLabel.textContent = ++nextNumber;
  feedback.textContent = '';
  if (event.detail === 0) replacement.focus({ preventScroll: true });
});

games.set('seifenblasen', {
  title: 'Seifenblasen',
  category: 'training',
  load(selectedLevel) {
    level = selectedLevel;
    reset();
  },
  leave: session.leave,
});
