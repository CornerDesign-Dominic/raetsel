import { games } from './puzzle-levels.js';

const modes = [
  { title: 'Kurz', count: 10 },
  { title: 'Mittel', count: 25 },
  { title: 'Lang', count: 50 },
  { title: 'Unendlich', count: Infinity },
];
const format = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const root = document.querySelector('#training-game');
const modeOptions = modes.map(({ title, count }, index) => `
  <label>
    <input type="radio" name="training-mode" value="${index}" ${index === 0 ? 'checked' : ''}>
    <span>${title}${Number.isFinite(count) ? `<small>${count} Aufgaben</small>` : ''}</span>
  </label>`).join('');
const digits = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((digit) =>
  `<button type="button" data-digit="${digit}">${digit}</button>`).join('');

root.innerHTML = `
  <section class="board training-board" aria-label="Einmaleins üben">
    <fieldset class="training-modes">
      <legend>Trainingsdauer</legend>
      <div class="training-mode-grid">${modeOptions}</div>
    </fieldset>

    <dl class="training-stats" aria-label="Statistik">
      <div><dt>Zeit</dt><dd id="training-time">0,00 s</dd></div>
      <div><dt>Richtig</dt><dd id="training-score">0 / 0</dd></div>
      <div><dt>Antworten/s</dt><dd id="training-speed">0,00</dd></div>
    </dl>

    <ol id="training-history" class="training-history" aria-label="Letzte Antworten"></ol>
    <p id="training-feedback" class="training-sr" role="status"></p>

    <form id="training-form">
      <div class="training-task" id="training-task" hidden>
        <label id="training-question" for="training-answer"></label>
        <input id="training-answer" type="text" inputmode="none" autocomplete="off" maxlength="3" disabled>
      </div>
      <div id="training-start" class="training-start">
        <p id="training-summary" tabindex="-1" hidden></p>
        <button id="training-go" type="button">Go</button>
      </div>

      <fieldset id="training-controls" class="training-controls" aria-label="Nummernblock" disabled>
        <div class="training-actions">
          <button id="training-reset" class="icon-button secondary-action" type="button"
            aria-label="Durchlauf zurücksetzen" title="Durchlauf zurücksetzen">
            <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
          </button>
          <button id="training-submit" type="submit">Abgeben</button>
        </div>
        <div id="training-pad" class="training-pad">
          ${digits}
          <button id="training-backspace" class="training-backspace" type="button" aria-label="Letzte Ziffer löschen">⌫</button>
        </div>
      </fieldset>
    </form>

    <button id="training-stop" class="secondary-action" type="button" hidden>Beenden</button>
  </section>
`;

const modeControl = root.querySelector('.training-modes');
const form = root.querySelector('#training-form');
const controls = root.querySelector('#training-controls');
const submit = root.querySelector('#training-submit');
const input = root.querySelector('#training-answer');
const question = root.querySelector('#training-question');
const task = root.querySelector('#training-task');
const startArea = root.querySelector('#training-start');
const go = root.querySelector('#training-go');
const stop = root.querySelector('#training-stop');
const summary = root.querySelector('#training-summary');
const history = root.querySelector('#training-history');
const feedback = root.querySelector('#training-feedback');
const time = root.querySelector('#training-time');
const score = root.querySelector('#training-score');
const speed = root.querySelector('#training-speed');

let status = 'ready';
let mode = modes[0];
let startedAt = 0;
let timer;
let answered = 0;
let correct = 0;
let deck = [];
let previousPair;
let current;

function nextTask() {
  if (deck.length === 0) {
    for (let left = 1; left <= 10; left++) {
      for (let right = left; right <= 10; right++) deck.push([left, right]);
    }
    for (let index = deck.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }
    if (deck.at(-1).join() === previousPair) {
      [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
    }
  }

  const pair = deck.pop();
  previousPair = pair.join();
  const [left, right] = Math.random() < .5 ? pair : [pair[1], pair[0]];
  current = { label: left + ' × ' + right, answer: left * right };
  question.textContent = current.label + ' =';
  input.value = '';
  submit.disabled = true;
  input.focus({ preventScroll: true });
}

function updateStats(elapsed) {
  time.textContent = format.format(elapsed) + ' s';
  score.textContent = correct + ' / ' + answered;
  speed.textContent = format.format(elapsed > 0 ? answered / elapsed : 0);
}

function elapsedSeconds() {
  return (performance.now() - startedAt) / 1000;
}

function setStatus(next) {
  status = next;
  const running = status === 'running';
  modeControl.disabled = running;
  controls.disabled = !running;
  input.disabled = !running;
  task.hidden = !running;
  startArea.hidden = running;
  stop.hidden = !running || Number.isFinite(mode.count);
  summary.hidden = status !== 'finished';
  go.textContent = status === 'finished' ? 'Nochmal' : 'Go';
}

function reset() {
  window.clearInterval(timer);
  history.replaceChildren();
  feedback.textContent = '';
  answered = 0;
  correct = 0;
  deck = [];
  previousPair = undefined;
  current = undefined;
  setStatus('ready');
  updateStats(0);
}

function start() {
  if (status === 'running') return;
  mode = modes[Number(modeControl.querySelector('input:checked').value)];
  reset();
  setStatus('running');
  startedAt = performance.now();
  nextTask();
  timer = window.setInterval(() => updateStats(elapsedSeconds()), 100);
}

function finish(elapsed) {
  window.clearInterval(timer);
  updateStats(elapsed);
  setStatus('finished');
  summary.textContent = 'Fertig! ' + correct + ' von ' + answered + ' richtig.';
  summary.focus({ preventScroll: true });
}

function logAnswer(value, right) {
  const row = document.createElement('li');
  const equation = document.createElement('span');
  equation.textContent = current.label + ' = ' + value;
  const mark = document.createElement('span');
  mark.textContent = right ? '✓' : '✕';
  mark.className = right ? 'training-right' : 'training-wrong';
  mark.setAttribute('aria-label', right ? 'Richtig' : 'Falsch');
  row.append(equation, mark);
  history.append(row);
  if (history.children.length > 4) history.firstElementChild.remove();
  feedback.textContent = equation.textContent + (right ? '. Richtig.' : '. Falsch.');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (status !== 'running' || input.value === '') return;
  const elapsed = elapsedSeconds();
  const right = Number(input.value) === current.answer;
  answered++;
  if (right) correct++;
  logAnswer(input.value, right);

  if (answered === mode.count) {
    finish(elapsed);
    return;
  }

  nextTask();
  updateStats(elapsed);
});

input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(0, 3);
  submit.disabled = input.value === '';
});
input.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  if (!event.repeat && !submit.disabled) form.requestSubmit(submit);
});

root.querySelectorAll('[data-digit]').forEach((button) => {
  button.addEventListener('click', () => {
    if (input.value.length < 3) input.value += button.dataset.digit;
    submit.disabled = input.value === '';
    input.focus({ preventScroll: true });
  });
});
root.querySelector('#training-backspace').addEventListener('click', () => {
  input.value = input.value.slice(0, -1);
  submit.disabled = input.value === '';
  input.focus({ preventScroll: true });
});
root.querySelector('#training-reset').addEventListener('click', () => {
  reset();
  go.focus({ preventScroll: true });
});
go.addEventListener('click', start);
stop.addEventListener('click', () => finish(elapsedSeconds()));

games.set('einmaleins', {
  title: '1×1-Training',
  category: 'zahlen-und-muster',
  direct: true,
  load: reset,
  leave: () => window.clearInterval(timer),
});
