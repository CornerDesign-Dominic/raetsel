import { games, markSolved } from './puzzle-levels.js';

const operations = {
  '+': (value, amount) => value + amount,
  '−': (value, amount) => value - amount,
  '×': (value, amount) => value * amount,
  '÷': (value, amount) => value / amount,
};

// Each listed step repeats in order. The same rule creates the clues and checks the answer.
const sets = {
  leicht: [
    [2, ['+', 3]], [18, ['−', 4]], [3, ['×', 2]], [64, ['÷', 2]],
  ],
  mittel: [
    [11, ['+', 8]], [91, ['−', 13]], [2, ['×', 3]], [405, ['÷', 3]],
  ],
  schwer: [
    [4, ['×', 2], ['+', 3]], [54, ['−', 6], ['÷', 2]],
    [32, ['÷', 2], ['+', 4]], [5, ['+', 4], ['×', 3]],
  ],
};
const clueCounts = { leicht: 3, mittel: 4, schwer: 5 };
const view = document.querySelector('[data-view="zahlenreihe"]');
const progress = view.querySelector('.exercise-progress');
const form = view.querySelector('form');
const row = view.querySelector('.number-series');
const input = view.querySelector('input');
const check = form.querySelector('button');
const feedback = view.querySelector('[role="status"]');
const next = view.querySelector('.exercise-next');
let level;
let round;
let answer;
let explanation;
let solved;

function showRound() {
  const [seed, ...steps] = sets[level][round];
  const values = [seed];
  for (let index = 0; index < clueCounts[level]; index++) {
    const [sign, amount] = steps[index % steps.length];
    values.push(operations[sign](values.at(-1), amount));
  }
  answer = values.pop();
  const stepLabels = steps.map((step) => step.join(' '));
  explanation = steps.length === 1
    ? 'Immer ' + stepLabels[0] + '.'
    : stepLabels.join(' und ') + ' im Wechsel.';

  row.replaceChildren(...values.map((value) => {
    const cell = document.createElement('span');
    cell.className = 'series-clue';
    cell.textContent = value;
    return cell;
  }), input);
  progress.textContent = `Aufgabe ${round + 1} von ${sets[level].length}`;
  input.value = '';
  input.readOnly = false;
  input.removeAttribute('aria-invalid');
  form.removeAttribute('data-answer');
  feedback.textContent = '';
  check.hidden = false;
  next.hidden = true;
  solved = false;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (solved) return;
  const guess = input.value.trim();
  if (!/^\d+$/.test(guess)) {
    feedback.textContent = 'Gib eine ganze Zahl ein.';
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  if (Number(guess) !== answer) {
    feedback.textContent = 'Passt noch nicht. Versuch es nochmal.';
    input.setAttribute('aria-invalid', 'true');
    form.dataset.answer = 'wrong';
    return;
  }

  solved = true;
  const finished = round === sets[level].length - 1;
  if (finished) markSolved('zahlenreihe', level);
  form.dataset.answer = 'correct';
  feedback.textContent = (finished ? 'Alle Aufgaben gelöst! ' : 'Richtig! ') + explanation;
  input.readOnly = true;
  input.removeAttribute('aria-invalid');
  check.hidden = true;
  next.textContent = finished ? 'Nochmal' : 'Weiter';
  next.hidden = false;
  next.focus({ preventScroll: true });
});

input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  form.removeAttribute('data-answer');
  feedback.textContent = '';
});

next.addEventListener('click', () => {
  round = (round + 1) % sets[level].length;
  showRound();
  progress.focus({ preventScroll: true });
});

games.set('zahlenreihe', {
  title: 'Zahlenreihe',
  category: 'training',
  load(activeLevel) {
    level = activeLevel;
    round = 0;
    showRound();
  },
});
