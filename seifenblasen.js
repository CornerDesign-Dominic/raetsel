import { games, levels } from './puzzle-levels.js';

const bubbleCount = 6;
const movingCounts = { leicht: 0, mittel: 2, schwer: 5 };
const root = document.querySelector('#bubble-game');

root.innerHTML = `
  <div class="bubble-toolbar">
    <dl class="bubble-stats">
      <div><dt>Stufe</dt><dd id="bubble-level"></dd></div>
      <div><dt>Nächste Zahl</dt><dd id="bubble-next" aria-live="polite">1</dd></div>
    </dl>
    <button type="button" class="icon-button bubble-restart" id="bubble-restart"
      aria-label="Neu starten" title="Neu starten">
      <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
    </button>
  </div>
  <div class="bubble-field" id="bubble-field" role="group" aria-label="Seifenblasen"></div>
  <p class="bubble-feedback" id="bubble-feedback" role="status"></p>
`;

const field = root.querySelector('#bubble-field');
const feedback = root.querySelector('#bubble-feedback');
const levelLabel = root.querySelector('#bubble-level');
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
  nextNumber = 1;
  highestNumber = bubbleCount;
  nextLabel.textContent = nextNumber;
  feedback.textContent = '';
  lastMiss = undefined;
  for (const slot of slots) slot.replaceChildren();

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
  if (!button) return;

  lastMiss?.classList.remove('is-missed');
  lastMiss = undefined;
  if (Number(button.dataset.number) !== nextNumber) {
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

root.querySelector('#bubble-restart').addEventListener('click', start);

games.set('seifenblasen', {
  title: 'Seifenblasen',
  category: 'zahlen',
  load(selectedLevel) {
    level = selectedLevel;
    levelLabel.textContent = levels[level];
    start();
  },
});
