import { games, recordScore } from './puzzle-levels.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const gameId = 'rasterform';
const totalRounds = 10;
const feedbackDuration = 2000;
const seconds = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTime = centiseconds => seconds.format(centiseconds / 100) + ' s';
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
    const distinctShifts = shifts.filter((shift, index) => {
      const variants = rotations(shift);
      return !shifts.slice(0, index).some(other => variants.includes(other));
    });
    if (distinctShifts.length >= 2) forms.push({ pattern, turns, mirror, shifts: distinctShifts });
  }
  return forms;
}

const pick = values => values[Math.floor(Math.random() * values.length)];

function createPuzzle(forms, previousPattern) {
  const form = pick(forms.filter(candidate => !candidate.turns.includes(previousPattern)));
  const firstShift = pick(form.shifts);
  const secondShift = pick(form.shifts.filter(shift => shift !== firstShift));
  const options = [
    pick(form.turns.slice(1)),
    pick(rotations(form.mirror)),
    pick(rotations(firstShift)),
    pick(rotations(secondShift)),
  ];
  for (let index = options.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [options[index], options[other]] = [options[other], options[index]];
  }
  return { pattern: form.pattern, options, correctIndex: options.findIndex(option => form.turns.includes(option)) };
}

const root = document.querySelector('#raster-game');
root.innerHTML = `
  <div class="training-toolbar">
    <dl class="training-stats training-progress">
      <div><dt>Aufgabe</dt><dd id="raster-progress"></dd></div>
      <div><dt>Zeit</dt><dd id="raster-time">0,00 s</dd></div>
    </dl>
  </div>
  <div class="training-stage raster-stage">
    <div class="raster-task" hidden>
      <div class="raster-model">
        <strong>Vorbild</strong>
        <div id="raster-model" role="img"></div>
      </div>
      <div class="raster-options" role="group" aria-label="Vier Antwortmöglichkeiten"></div>
      <div class="raster-transition">
        <p class="raster-feedback" role="status"></p>
        <p class="raster-countdown" aria-hidden="true"></p>
        <div class="raster-countdown-track" aria-hidden="true"></div>
      </div>
    </div>
  </div>
`;

const progress = root.querySelector('#raster-progress');
const stage = root.querySelector('.raster-stage');
const task = root.querySelector('.raster-task');
const model = root.querySelector('#raster-model');
const options = root.querySelector('.raster-options');
const feedback = root.querySelector('.raster-feedback');
const countdown = root.querySelector('.raster-countdown');
task.style.setProperty('--raster-feedback-duration', feedbackDuration + 'ms');
const timeLabel = root.querySelector('#raster-time');
const go = addStageAction(stage, showRound);
const session = mountTrainingSession(root, {
  toolbar: root.querySelector('.training-toolbar'), stage, reset,
});

let forms;
let level;
let round;
let score;
let previousPattern;
let answered;
let elapsed;
let startedAt;
let feedbackTimer;
let countdownTimer;
let clockTimer;

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
  progress.textContent = round + ' / ' + totalRounds;
}

function clearTimers() {
  window.clearTimeout(feedbackTimer);
  window.clearTimeout(countdownTimer);
  window.clearInterval(clockTimer);
}

function updateTime() {
  const current = answered ? elapsed : elapsed + performance.now() - startedAt;
  timeLabel.textContent = formatTime(Math.round(current / 10));
}

function reset() {
  clearTimers();
  elapsed = 0;
  timeLabel.textContent = formatTime(0);
  round = 1;
  score = 0;
  previousPattern = undefined;
  showProgress();
  session.setRunning(false);
  task.hidden = true;
  go.hidden = false;
}

function showRound() {
  showProgress();
  session.setRunning(true);
  go.hidden = true;
  task.hidden = false;
  feedback.textContent = '';
  task.removeAttribute('data-answered');
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
  startedAt = performance.now();
  clockTimer = window.setInterval(updateTime, 100);
}

function answer(selected, correct) {
  if (answered) return;
  elapsed += performance.now() - startedAt;
  answered = true;
  window.clearInterval(clockTimer);
  updateTime();
  const isCorrect = selected === correct;
  if (isCorrect) score++;
  options.children[selected].dataset.answer = isCorrect ? 'correct' : 'wrong';
  options.children[correct].dataset.answer = 'correct';
  for (const button of options.children) button.disabled = true;
  feedback.textContent = isCorrect ? 'Richtig!' : `Richtig ist ${String.fromCharCode(65 + correct)}.`;
  const destination = round < totalRounds ? 'Nächste Aufgabe' : 'Ergebnis';
  countdown.textContent = destination + ' in 2 s';
  task.setAttribute('data-answered', '');
  countdownTimer = window.setTimeout(() => {
    countdown.textContent = destination + ' in 1 s';
  }, feedbackDuration - 1000);
  feedbackTimer = window.setTimeout(() => {
    if (round < totalRounds) {
      round++;
      showRound();
      return;
    }
    task.hidden = true;
    const time = Math.round(elapsed / 10);
    const achievement = recordScore(gameId, level, { score, time });
    session.finish({
      title: achievement ? 'Glückwunsch!' : 'Durchlauf beendet',
      detail: achievement ? 'Neuer persönlicher Rekord!' : '',
      record: Boolean(achievement),
      metrics: [['Richtig', score + ' / ' + totalRounds], ['Zeit', formatTime(time)]],
    });
  }, feedbackDuration);
}

games.set(gameId, {
  title: 'Rasterform',
  category: 'training',
  score: {
    columns: ['Richtig', 'Zeit'],
    valid(result) {
      return Number.isInteger(result?.score) && result.score >= 0 && result.score <= totalRounds
        && Number.isSafeInteger(result.time) && result.time >= 0;
    },
    compare(a, b) {
      return b.score - a.score || a.time - b.time;
    },
    format(result) {
      return [result.score + ' / ' + totalRounds, formatTime(result.time)];
    },
  },
  load(selectedLevel) {
    level = selectedLevel;
    forms = candidateForms(filledCounts[level]);
    reset();
  },
  leave() {
    clearTimers();
    session.leave();
  },
});
