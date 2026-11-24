import { games } from './puzzle-levels.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const bubbleCount = 6;
const movingCounts = { leicht: 0, mittel: 2, schwer: 5 };
const edgeInset = 4;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.querySelector('#bubble-game');

root.innerHTML = `
  <div class="training-toolbar">
    <p class="training-progress">Nächste Zahl <strong id="bubble-next">1</strong></p>
    <button type="button" class="secondary-action" id="bubble-stop" hidden>Beenden</button>
  </div>
  <div class="training-stage bubble-stage">
    <div class="bubble-field" id="bubble-field" role="group" aria-label="Seifenblasen" hidden></div>
    <p class="bubble-feedback" id="bubble-feedback" role="status"></p>
  </div>
`;

const field = root.querySelector('#bubble-field');
const feedback = root.querySelector('#bubble-feedback');
const nextLabel = root.querySelector('#bubble-next');
const bubbles = new Map();
const bounds = { x: 0, y: 0 };
let frame;
let lastFrameTime;
const resizeObserver = new ResizeObserver(updateBounds);

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
  clearField();
  stop.hidden = true;
  feedback.textContent = '';
  session.finish({ metrics: [['Geplatzt', nextNumber - 1], ['Fehlversuche', misses]] });
});

function clearField() {
  stopMotion();
  resizeObserver.disconnect();
  field.hidden = true;
  bubbles.clear();
  field.replaceChildren();
  lastMiss = undefined;
}

function reset() {
  session.setRunning(false);
  clearField();
  stop.hidden = true;
  nextLabel.textContent = '1';
  feedback.textContent = '';
  go.hidden = false;
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}

function draw({ orbit, x, y }) {
  orbit.style.transform = `translate(${edgeInset + x * bounds.x}px, ${edgeInset + y * bounds.y}px)`;
}

function updateBounds() {
  const bubble = bubbles.values().next().value;
  if (!bubble) return;
  bounds.x = Math.max(0, field.clientWidth - bubble.orbit.offsetWidth - 2 * edgeInset);
  bounds.y = Math.max(0, field.clientHeight - bubble.orbit.offsetHeight - 2 * edgeInset);
  for (const current of bubbles.values()) draw(current);
}

function findOpenPosition(previous) {
  const avoid = [...bubbles.values()];
  if (previous) avoid.push(previous);
  if (!avoid.length) return { x: Math.random(), y: Math.random() };
  let best;
  let bestDistance = -1;
  for (let attempt = 0; attempt < 16; attempt++) {
    const x = Math.random();
    const y = Math.random();
    const distance = Math.min(...avoid.map((other) =>
      Math.hypot((other.x - x) * bounds.x, (other.y - y) * bounds.y)));
    if (distance > bestDistance) {
      best = { x, y };
      bestDistance = distance;
    }
  }
  return best;
}

function placeBubble(number, moving, previous) {
  const orbit = document.createElement('div');
  orbit.className = 'bubble-orbit';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bubble';
  button.dataset.number = number;
  const label = String(number);
  button.textContent = label;
  if (label.length >= 4) button.style.setProperty('--bubble-label-size', `${45 / label.length}px`);
  orbit.append(button);
  field.append(orbit);

  if (!bubbles.size) {
    bounds.x = Math.max(0, field.clientWidth - orbit.offsetWidth - 2 * edgeInset);
    bounds.y = Math.max(0, field.clientHeight - orbit.offsetHeight - 2 * edgeInset);
  }

  const direction = () => (Math.random() < 0.5 ? -1 : 1) * (34 + Math.random() * 32);
  const bubble = { orbit, ...findOpenPosition(previous), moving, vx: direction(), vy: direction() };
  bubbles.set(button, bubble);
  draw(bubble);
  return button;
}

function stopMotion() {
  if (frame !== undefined) window.cancelAnimationFrame(frame);
  frame = lastFrameTime = undefined;
}

function syncMotion() {
  stopMotion();
  if (!field.hidden && movingCounts[level] && !reducedMotion.matches) {
    frame = window.requestAnimationFrame(animate);
  }
}

function animate(now) {
  const elapsed = lastFrameTime === undefined ? 0 : Math.min(now - lastFrameTime, 50) / 1000;
  lastFrameTime = now;
  for (const [button, bubble] of bubbles) {
    if (!bubble.moving || button.matches(':focus-visible')) continue;
    for (const axis of ['x', 'y']) {
      if (bounds[axis] === 0) continue;
      const speed = 'v' + axis;
      const position = bubble[axis] + bubble[speed] * elapsed / bounds[axis];
      if (position < 0 || position > 1) bubble[speed] *= -1;
      bubble[axis] = Math.max(0, Math.min(1, position));
    }
    draw(bubble);
  }
  frame = window.requestAnimationFrame(animate);
}

reducedMotion.addEventListener('change', syncMotion);

function start() {
  session.setRunning(true);
  go.hidden = true;
  field.hidden = stop.hidden = false;
  misses = 0;
  nextNumber = 1;
  highestNumber = bubbleCount;
  nextLabel.textContent = nextNumber;
  feedback.textContent = '';

  let movingLeft = movingCounts[level];
  for (let number = 1; number <= bubbleCount; number++) {
    const moving = randomIndex(bubbleCount - number + 1) < movingLeft;
    placeBubble(number, moving);
    if (moving) movingLeft--;
  }
  resizeObserver.observe(field);
  syncMotion();
}

function burst(button, orbit) {
  const effect = document.createElement('span');
  effect.className = 'bubble-burst';
  effect.setAttribute('aria-hidden', 'true');
  effect.addEventListener('animationend', () => orbit.remove(), { once: true });
  button.replaceWith(effect);
}

function tapBubble(button, keyboard = false) {
  lastMiss?.classList.remove('is-missed');
  lastMiss = undefined;
  if (Number(button.dataset.number) !== nextNumber) {
    misses++;
    button.classList.add('is-missed');
    lastMiss = button;
    feedback.textContent = `Tippe auf die ${nextNumber}.`;
    return;
  }

  const bubble = bubbles.get(button);
  bubbles.delete(button);
  burst(button, bubble.orbit);
  const replacement = placeBubble(++highestNumber, bubble.moving, bubble);
  nextLabel.textContent = ++nextNumber;
  feedback.textContent = '';
  if (keyboard) replacement.focus({ preventScroll: true });
}

field.addEventListener('pointerdown', (event) => {
  if (field.hidden || event.button !== 0 || !event.isPrimary) return;
  let hit;
  for (const button of bubbles.keys()) {
    const { left, top, width, height } = button.getBoundingClientRect();
    if (!width || !height) continue;
    const dx = (event.clientX - left) / width - 0.5;
    const dy = (event.clientY - top) / height - 0.5;
    if (dx * dx + dy * dy > 0.25) continue;
    hit = button;
    if (Number(button.dataset.number) === nextNumber) break;
  }
  if (hit) tapBubble(hit);
});

field.addEventListener('click', (event) => {
  if (field.hidden || event.detail !== 0 || event.pointerType) return;
  const button = event.target.closest('.bubble');
  if (bubbles.has(button)) tapBubble(button, true);
});

games.set('seifenblasen', {
  title: 'Seifenblasen',
  category: 'training',
  load(selectedLevel) {
    level = selectedLevel;
    reset();
  },
  leave() {
    clearField();
    session.leave();
  },
});
