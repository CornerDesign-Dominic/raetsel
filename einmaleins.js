import { games, recordScore } from './puzzle-levels.js';
import { mountNumberPad } from './number-pad.js';

const modes = {
  kurz: { title: 'Kurz', count: 10 },
  mittel: { title: 'Mittel', count: 25 },
  lang: { title: 'Lang', count: 50 },
  unendlich: { title: 'Unendlich', count: Infinity },
};
const format = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const root = document.querySelector('#training-game');
root.innerHTML = `
  <section class="training-toolbar" aria-label="Laufender Durchlauf">
    <dl class="training-stats training-progress">
      <div><dt>Zeit</dt><dd id="training-time">0,00 s</dd></div>
      <div><dt>Antworten</dt><dd id="training-answered">0</dd></div>
    </dl>
    <button id="training-reset" class="icon-button" type="button" aria-label="Durchlauf zurücksetzen"
      title="Durchlauf zurücksetzen" aria-haspopup="dialog" aria-controls="training-reset-dialog" disabled>
      <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
    </button>
  </section>
  <div class="training-stop-row">
    <button id="training-stop" class="secondary-action" type="button" hidden>Beenden</button>
  </div>
  <section class="training-board" aria-label="Einmaleins üben">
    <p id="training-feedback" class="training-sr" role="status"></p>

    <form class="number-training-form" id="training-form">
      <div class="training-stage">
        <ol id="training-history" class="training-history" aria-label="Letzte Antworten"></ol>
        <div class="training-task" id="training-task" hidden>
          <label id="training-question" for="training-answer"></label>
          <input id="training-answer" type="text" inputmode="none" autocomplete="off" maxlength="3" disabled>
        </div>
        <button id="training-go" class="training-start" type="button">Tippe, um zu beginnen</button>
      </div>

      <fieldset id="training-controls" class="training-controls" aria-label="Nummernblock" disabled>
        <div class="training-actions">
          <button class="number-training-submit" id="training-submit" type="submit">Abgeben</button>
        </div>
        <div id="training-pad" class="training-pad"></div>
      </fieldset>
    </form>
  </section>
  <dialog class="result-dialog training-result-dialog" id="training-results" aria-labelledby="training-summary" aria-describedby="training-result-message">
    <form method="dialog">
      <button class="icon-button dialog-close" type="submit" aria-label="Ergebnis schließen">
        <span aria-hidden="true">×</span>
      </button>
    </form>
    <h2 id="training-summary" tabindex="-1" autofocus></h2>
    <p id="training-result-message"></p>
    <dl class="training-result-stats">
      <div><dt>Richtig</dt><dd id="training-score"></dd></div>
      <div><dt>s/Antwort</dt><dd id="training-speed"></dd></div>
      <div><dt>Gesamt</dt><dd id="training-total"></dd></div>
    </dl>
    <div class="training-result-actions">
      <button id="training-again" type="button">Nochmal</button>
      <button id="training-leave" class="secondary-action" type="button">Verlassen</button>
    </div>
  </dialog>
  <dialog class="result-dialog" id="training-reset-dialog"
    aria-labelledby="training-reset-title" aria-describedby="training-reset-message">
    <h2 id="training-reset-title">Durchlauf abbrechen?</h2>
    <p id="training-reset-message">Dein Fortschritt in diesem Durchlauf geht verloren.</p>
    <form method="dialog">
      <button class="icon-button dialog-close" type="submit" aria-label="Weiterspielen" autofocus>
        <span aria-hidden="true">×</span>
      </button>
      <button id="training-confirm-reset" type="button">Durchlauf abbrechen</button>
    </form>
  </dialog>
`;

const form = root.querySelector('#training-form');
const controls = root.querySelector('#training-controls');
const submit = root.querySelector('#training-submit');
const input = root.querySelector('#training-answer');
const question = root.querySelector('#training-question');
const task = root.querySelector('#training-task');
const go = root.querySelector('#training-go');
const stop = root.querySelector('#training-stop');
const resetButton = root.querySelector('#training-reset');
const resetDialog = root.querySelector('#training-reset-dialog');
const summary = root.querySelector('#training-summary');
const results = root.querySelector('#training-results');
const answeredCount = root.querySelector('#training-answered');
const history = root.querySelector('#training-history');
const feedback = root.querySelector('#training-feedback');
const time = root.querySelector('#training-time');
const score = root.querySelector('#training-score');
const speed = root.querySelector('#training-speed');
const total = root.querySelector('#training-total');
const resultMessage = root.querySelector('#training-result-message');

let status = 'ready';
let mode;
let activeLevel;
let startedAt = 0;
let timer;
let answered = 0;
let correct = 0;
let current;
const factors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function nextTask() {
  const available = factors.filter((factor) => factor !== current?.left && factor !== current?.right);
  const left = available[Math.floor(Math.random() * available.length)];
  const right = available[Math.floor(Math.random() * available.length)];
  current = { left, right, label: left + ' × ' + right, answer: left * right };
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
  resetButton.disabled = !running;
  input.disabled = !running;
  task.hidden = !running;
  go.hidden = running;
  stop.hidden = !running || Number.isFinite(mode.count);
  go.classList.toggle('training-repeat', status === 'finished');
  go.textContent = status === 'finished' ? 'Ergebnis anzeigen' : 'Tippe, um zu beginnen';
}

function reset() {
  window.clearInterval(timer);
  history.replaceChildren();
  feedback.textContent = '';
  input.value = '';
  submit.disabled = true;
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
  score.textContent = correct + ' / ' + answered;
  const seconds = answered > 0 ? elapsed / answered : 0;
  speed.textContent = answered > 0 ? format.format(seconds) : '–';
  total.textContent = format.format(elapsed) + ' s';
  const achievement = answered > 0
    ? recordScore('einmaleins', activeLevel, { errors: answered - correct, seconds, answered, elapsed })
    : undefined;
  results.classList.toggle('is-record', Boolean(achievement));
  summary.textContent = achievement ? 'Glückwunsch!' : 'Durchlauf beendet';
  resultMessage.textContent = achievement === 'first'
    ? 'Du hast deinen ersten persönlichen Rekord aufgestellt!'
    : achievement === 'record' ? 'Du hast deinen persönlichen Rekord geknackt!' : '';
  resultMessage.hidden = !achievement;
  results.showModal();
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

mountNumberPad(root.querySelector('#training-pad'), input);
go.addEventListener('click', () => {
  if (status === 'finished') {
    results.showModal();
    return;
  }

  start();
});
results.addEventListener('close', () => {
  if (status === 'finished' && !root.closest('[hidden]') && !results.open) go.focus({ preventScroll: true });
});
root.querySelector('#training-again').addEventListener('click', () => {
  reset();
  results.close();
  go.focus({ preventScroll: true });
});
root.querySelector('#training-leave').addEventListener('click', () => {
  results.close();
  window.location.hash = 'training';
});
stop.addEventListener('click', () => finish(elapsedSeconds()));
resetButton.addEventListener('click', () => {
  if (status === 'running' && !resetDialog.open) resetDialog.showModal();
});
root.querySelector('#training-confirm-reset').addEventListener('click', () => {
  resetDialog.close();
  reset();
  go.focus({ preventScroll: true });
});

games.set('einmaleins', {
  title: '1×1-Training',
  category: 'training',
  score: {
    valid(result) {
      return Number.isSafeInteger(result?.answered) && result.answered > 0
        && Number.isSafeInteger(result.errors) && result.errors >= 0 && result.errors <= result.answered
        && Number.isFinite(result.seconds) && result.seconds >= 0;
    },
    compare(a, b) {
      return a.errors - b.errors || a.seconds - b.seconds;
    },
    format({ errors, seconds, answered, elapsed }) {
      return [
        (answered - errors) + ' / ' + answered,
        format.format(seconds),
        format.format(elapsed ?? seconds * answered) + ' s',
      ];
    },
  },
  options: Object.fromEntries(Object.entries(modes).map(([key, { title, count }]) =>
    [key, Number.isFinite(count) ? title + ' · ' + count + ' Aufgaben' : title])),
  load(level) {
    activeLevel = level;
    mode = modes[level];
    document.querySelector('#training-mode-label').textContent = this.options[level];
    reset();
  },
  leave() {
    window.clearInterval(timer);
    if (results.open) results.close();
    if (resetDialog.open) resetDialog.close();
  },
});
