import { games } from './puzzle-levels.js';

const modes = {
  kurz: { title: 'Kurz', count: 10 },
  mittel: { title: 'Mittel', count: 25 },
  lang: { title: 'Lang', count: 50 },
  unendlich: { title: 'Unendlich', count: Infinity },
};
const format = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const root = document.querySelector('#training-game');
const digits = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((digit) =>
  `<button type="button" data-digit="${digit}">${digit}</button>`).join('');

root.innerHTML = `
  <section class="training-progress" aria-label="Laufender Durchlauf">
    <dl class="training-stats">
      <div><dt>Zeit</dt><dd id="training-time">0,00 s</dd></div>
      <div><dt>Antworten</dt><dd id="training-answered">0</dd></div>
    </dl>
  </section>
  <div class="training-stop-row">
    <button id="training-stop" class="secondary-action" type="button" hidden>Beenden</button>
  </div>
  <section class="training-board" aria-label="Einmaleins üben">
    <section id="training-results" class="training-results" aria-labelledby="training-summary" hidden>
      <h3 id="training-summary" tabindex="-1"></h3>
      <dl class="training-stats" aria-label="Statistik">
        <div><dt>Richtig</dt><dd id="training-score">0 / 0</dd></div>
        <div><dt>Antworten pro Sekunde</dt><dd id="training-speed">0,00</dd></div>
      </dl>
    </section>
    <ol id="training-history" class="training-history" aria-label="Letzte Antworten"></ol>
    <p id="training-feedback" class="training-sr" role="status"></p>

    <form id="training-form">
      <div class="training-task" id="training-task" hidden>
        <label id="training-question" for="training-answer"></label>
        <input id="training-answer" type="text" inputmode="none" autocomplete="off" maxlength="3" disabled>
      </div>
      <div id="training-start" class="training-start">
        <button id="training-go" type="button">Go</button>
      </div>

      <fieldset id="training-controls" class="training-controls" aria-label="Nummernblock" disabled>
        <div class="training-actions">
          <button id="training-submit" type="submit">Abgeben</button>
        </div>
        <div id="training-pad" class="training-pad">
          ${digits}
          <button id="training-clear" class="icon-button" type="button" aria-label="Eingabe leeren" title="Eingabe leeren">
            <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
          </button>
        </div>
      </fieldset>
    </form>
  </section>
`;

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
const results = root.querySelector('#training-results');
const answeredCount = root.querySelector('#training-answered');
const history = root.querySelector('#training-history');
const feedback = root.querySelector('#training-feedback');
const time = root.querySelector('#training-time');
const score = root.querySelector('#training-score');
const speed = root.querySelector('#training-speed');

let status = 'ready';
let mode;
let startedAt = 0;
let timer;
let answered = 0;
let correct = 0;
let current;

function nextTask() {
  const left = 1 + Math.floor(Math.random() * 10);
  const right = 1 + Math.floor(Math.random() * 10);
  current = { label: left + ' × ' + right, answer: left * right };
  question.textContent = current.label + ' =';
  input.value = '';
  submit.disabled = true;
  input.focus({ preventScroll: true });
}

function updateStats(elapsed) {
  time.textContent = format.format(elapsed) + ' s';
  answeredCount.textContent = String(answered);
}

function elapsedSeconds() {
  return (performance.now() - startedAt) / 1000;
}

function setStatus(next) {
  status = next;
  const running = status === 'running';
  controls.disabled = !running;
  input.disabled = !running;
  task.hidden = !running;
  startArea.hidden = running;
  stop.hidden = !running || Number.isFinite(mode.count);
  results.hidden = status !== 'finished';
  go.textContent = status === 'finished' ? 'Nochmal' : 'Go';
}

function reset() {
  window.clearInterval(timer);
  history.replaceChildren();
  feedback.textContent = '';
  answered = 0;
  correct = 0;
  current = undefined;
  setStatus('ready');
  updateStats(0);
}

function start() {
  if (status === 'running') return;
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
  summary.textContent = 'Durchlauf beendet';
  score.textContent = correct + ' / ' + answered;
  speed.textContent = format.format(elapsed > 0 ? answered / elapsed : 0);
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
root.querySelector('#training-clear').addEventListener('click', () => {
  input.value = '';
  submit.disabled = true;
  input.focus({ preventScroll: true });
});
go.addEventListener('click', start);
stop.addEventListener('click', () => finish(elapsedSeconds()));

games.set('einmaleins', {
  title: '1×1-Training',
  category: 'zahlen-und-muster',
  chooserTitle: 'Trainingsdauer wählen',
  options: Object.fromEntries(Object.entries(modes).map(([key, { title, count }]) =>
    [key, Number.isFinite(count) ? title + ' · ' + count + ' Aufgaben' : title])),
  load(level) {
    mode = modes[level];
    document.querySelector('#training-mode-label').textContent = this.options[level];
    reset();
  },
  leave: () => window.clearInterval(timer),
});
