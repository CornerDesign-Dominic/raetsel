import { games, markSolved } from './puzzle-levels.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const colors = [
  ['Petrol', '#205a56'], ['Orange', '#c36335'], ['Blau', '#477ab5'],
  ['Violett', '#784287'], ['Grün', '#739a4a'], ['Rot', '#953b42'],
];
// The group shares a set of stroke colors. One card changes exactly one stroke.
const sets = {
  leicht: [
    [[0, 1, 2], 0, 3], [[1, 3, 4], 2, 2],
    [[5, 0, 4], 1, 2], [[2, 0, 1], 2, 3],
  ],
  mittel: [
    [[0, 1, 2, 3], 0, 2], [[5, 4, 2, 3], 1, 5],
    [[1, 2, 5, 0], 1, 0], [[3, 4, 0, 1], 2, 1],
  ],
  schwer: [
    [[0, 1, 3, 0, 1], 0, 3], [[2, 3, 4, 3, 4], 3, 4],
    [[5, 4, 2, 2, 5], 2, 4], [[1, 2, 0, 2, 0], 4, 1],
  ],
};
const view = document.querySelector('[data-view="mustergruppe"]');
const progress = view.querySelector('.exercise-progress');
const choices = view.querySelector('.family-choices');
const feedback = view.querySelector('[role="status"]');
const next = view.querySelector('.exercise-next');
let level;
let round;
let solved;
let mistakes;
const stage = view.querySelector('.family-stage');
const task = stage.querySelector('.family-task');
const go = addStageAction(stage, showRound);
const session = mountTrainingSession(view, {
  toolbar: view.querySelector('.training-toolbar'), stage, reset: resetRun,
});

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function choose(button, odd) {
  if (solved || button.getAttribute('aria-disabled') === 'true') return;
  button.dataset.answer = odd ? 'correct' : 'wrong';
  button.querySelector('.family-mark').textContent = odd ? '✓' : '×';
  button.setAttribute('aria-disabled', 'true');
  button.tabIndex = -1;
  if (!odd) {
    mistakes++;
    feedback.textContent = 'Dieses Feld gehört zur Gruppe.';
    return;
  }
  solved = true;
  const finished = round === sets[level].length - 1;
  for (const choice of choices.children) {
    choice.setAttribute('aria-disabled', 'true');
    choice.tabIndex = -1;
  }
  if (finished) {
    markSolved('mustergruppe', level);
    task.hidden = true;
    session.finish({ metrics: [['Gefunden', sets[level].length + ' / ' + sets[level].length], ['Fehlversuche', mistakes]] });
    return;
  }
  feedback.textContent = 'Richtig! Ein Strich hat hier eine andere Farbe.';
  next.hidden = false;
  next.focus({ preventScroll: true });
}

function showRound() {
  go.hidden = true;
  task.hidden = false;
  session.setRunning(true);
  solved = false;
  const [palette, changed, replacement] = sets[level][round];
  const different = [...palette];
  different[changed] = replacement;
  const oddIndex = Math.floor(Math.random() * 4);
  const commonOrder = shuffle(palette);
  let offset = 0;
  progress.textContent = `Aufgabe ${round + 1} von ${sets[level].length}`;
  feedback.textContent = '';
  next.hidden = true;
  choices.replaceChildren(...Array.from({ length: 4 }, (_, index) => {
    const odd = index === oddIndex;
    const order = odd ? shuffle(different) : commonOrder.slice(offset).concat(commonOrder.slice(0, offset));
    if (!odd) offset++;
    const letter = String.fromCharCode(65 + index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'family-choice';
    button.setAttribute('aria-label', `Feld ${letter}: ${order.map((color) => colors[color][0]).join(', ')}`);

    const pattern = document.createElement('span');
    pattern.className = 'family-strokes';
    pattern.setAttribute('aria-hidden', 'true');
    pattern.replaceChildren(...order.map((color) => {
      const stroke = document.createElement('span');
      stroke.style.setProperty('--stroke-color', colors[color][1]);
      return stroke;
    }));
    const label = document.createElement('span');
    label.className = 'family-letter';
    label.textContent = letter;
    const mark = document.createElement('span');
    mark.className = 'family-mark';
    mark.setAttribute('aria-hidden', 'true');
    button.append(pattern, label, mark);
    button.addEventListener('click', () => choose(button, odd));
    return button;
  }));
  choices.firstElementChild.focus({ preventScroll: true });
}

next.addEventListener('click', () => {
  round++;
  showRound();
});

function resetRun() {
  round = mistakes = 0;
  session.setRunning(false);
  progress.textContent = `Aufgabe 1 von ${sets[level].length}`;
  task.hidden = next.hidden = true;
  go.hidden = false;
}

games.set('mustergruppe', {
  title: 'Mustergruppe',
  category: 'training',
  load(activeLevel) {
    level = activeLevel;
    resetRun();
  },
  leave: session.leave,
});
