import { games } from './puzzle-levels.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const gameId = 'rasterform';
const totalRounds = 10;
const filledCounts = { leicht: 3, mittel: 4, schwer: 5 };
const cells = Array.from({ length: 9 }, (_, index) => index);

function remap(pattern, destination) {
  return cells.reduce((result, index) => {
    if (!(pattern & (1 << index))) return result;
    return result | (1 << destination(Math.floor(index / 3), index % 3));
  }, 0);
}

function rotate(pattern) {
  return remap(pattern, (row, column) => column * 3 + 2 - row);
}

function rotations(pattern) {
  const right = rotate(pattern);
  const upsideDown = rotate(right);
  return [pattern, right, upsideDown, rotate(upsideDown)];
}

function candidateForms(filledCount) {
  const forms = [];
  for (let pattern = 1; pattern < 1 << cells.length; pattern++) {
    const filled = cells.filter(index => pattern & (1 << index));
    if (filled.length !== filledCount) continue;
    const turns = rotations(pattern);
    const mirror = remap(pattern, (row, column) => row * 3 + 2 - column);
    if (new Set(turns).size !== 4 || turns.includes(mirror)) continue;

    // Exclude both solution and mirror in every orientation from the one-cell decoy.
    const excluded = [...turns, ...rotations(mirror)];
    const empty = cells.filter(index => !(pattern & (1 << index)));
    const shifts = filled.flatMap(from => empty
      .filter(to => Math.abs(Math.floor(from / 3) - Math.floor(to / 3)) + Math.abs(from % 3 - to % 3) === 1)
      .map(to => pattern ^ (1 << from) ^ (1 << to))).filter(shift => !excluded.includes(shift));
    if (shifts.length) forms.push({ pattern, turns, mirror, shifts });
  }
  return forms;
}

const pick = values => values[Math.floor(Math.random() * values.length)];

function createPuzzle(forms, previousPattern) {
  const form = pick(forms.filter(candidate => !candidate.turns.includes(previousPattern)));
  const correctIndex = Math.floor(Math.random() * 3);
  const decoys = [pick(rotations(form.mirror)), pick(rotations(pick(form.shifts)))];
  if (Math.random() < 0.5) decoys.reverse();
  decoys.splice(correctIndex, 0, pick(form.turns.slice(1)));
  return { pattern: form.pattern, options: decoys, correctIndex };
}

const root = document.querySelector('#raster-game');
root.innerHTML = `
  <div class="training-toolbar"><p class="training-progress" id="raster-progress"></p></div>
  <div class="training-stage raster-stage">
    <div class="raster-task" hidden>
      <div class="raster-model">
        <strong>Vorbild</strong>
        <div id="raster-model" role="img"></div>
      </div>
      <div class="raster-options" role="group" aria-label="Drei Antwortmöglichkeiten"></div>
      <p class="raster-feedback" role="status"></p>
    </div>
  </div>
  <button type="button" class="number-training-submit" id="raster-next" hidden>Weiter</button>
`;

const progress = root.querySelector('#raster-progress');
const stage = root.querySelector('.raster-stage');
const task = root.querySelector('.raster-task');
const model = root.querySelector('#raster-model');
const options = root.querySelector('.raster-options');
const feedback = root.querySelector('.raster-feedback');
const next = root.querySelector('#raster-next');
const go = addStageAction(stage, showRound);
const session = mountTrainingSession(root, {
  toolbar: root.querySelector('.training-toolbar'), stage, reset,
});

let forms;
let round;
let score;
let previousPattern;
let answered;

function drawGrid(element, pattern) {
  const grid = document.createElement('span');
  grid.className = 'raster-grid';
  grid.setAttribute('aria-hidden', 'true');
  grid.append(...cells.map(index => {
    const cell = document.createElement('span');
    cell.toggleAttribute('data-filled', Boolean(pattern & (1 << index)));
    return cell;
  }));
  element.append(grid);
}

function describeGrid(pattern) {
  const rows = cells.filter(index => index % 3 === 0);
  return rows.map((start, index) => {
    const filled = cells.slice(start, start + 3).filter(cell => pattern & (1 << cell));
    return 'Zeile ' + (index + 1) + ' ' + (filled.length ? filled.map(cell => cell % 3 + 1).join(', ') : 'leer');
  }).join('. ');
}

function showProgress() {
  progress.textContent = `Aufgabe ${round} von ${totalRounds}`;
}

function reset() {
  round = 1;
  score = 0;
  previousPattern = undefined;
  showProgress();
  session.setRunning(false);
  task.hidden = next.hidden = true;
  go.hidden = false;
}

function showRound() {
  showProgress();
  session.setRunning(true);
  go.hidden = true;
  task.hidden = false;
  next.hidden = true;
  feedback.textContent = '';
  answered = false;
  const puzzle = createPuzzle(forms, previousPattern);
  previousPattern = puzzle.pattern;
  model.setAttribute('aria-label', 'Vorbild. ' + describeGrid(puzzle.pattern));
  model.replaceChildren();
  drawGrid(model, puzzle.pattern);
  options.replaceChildren(...puzzle.options.map((pattern, index) => {
    const button = document.createElement('button');
    const letter = String.fromCharCode(65 + index);
    button.type = 'button';
    button.className = 'raster-choice';
    button.setAttribute('aria-label', letter + '. ' + describeGrid(pattern));
    drawGrid(button, pattern);
    const label = document.createElement('span');
    label.textContent = letter;
    button.append(label);
    button.addEventListener('click', () => answer(index, puzzle.correctIndex));
    return button;
  }));
  model.tabIndex = -1;
  model.focus({ preventScroll: true });
}

function answer(selected, correct) {
  if (answered) return;
  answered = true;
  const isCorrect = selected === correct;
  if (isCorrect) score++;
  options.children[selected].dataset.answer = isCorrect ? 'correct' : 'wrong';
  options.children[correct].dataset.answer = 'correct';
  for (const button of options.children) button.disabled = true;
  feedback.textContent = isCorrect ? 'Richtig!' : `Richtig ist ${String.fromCharCode(65 + correct)}.`;
  next.textContent = round === totalRounds ? 'Ergebnis' : 'Weiter';
  next.hidden = false;
  next.focus({ preventScroll: true });
}

next.addEventListener('click', () => {
  if (round === totalRounds) {
    task.hidden = next.hidden = true;
    session.finish({ metrics: [['Richtig', score + ' / ' + totalRounds]] });
    return;
  }
  round++;
  showRound();
});

games.set(gameId, {
  title: 'Rasterform',
  category: 'training',
  load(level) {
    forms = candidateForms(filledCounts[level]);
    reset();
  },
  leave: session.leave,
});
