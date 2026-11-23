import { games, markSolved } from './puzzle-levels.js';
import { mountNumberPad } from './number-pad.js';
import { addStageAction, mountTrainingSession } from './training-session.js';

const rounds = 8;
const day = 24 * 60;
const settings = {
  leicht: { step: 60, maxSteps: 6 },
  mittel: { step: 5, maxSteps: 48 },
  schwer: { step: 1, maxSteps: 360 },
};
const root = document.querySelector('#zeit-game');
const clockMarkup = label => `
  <figure class="time-clock">
    <figcaption><strong>${label}</strong><span data-period></span></figcaption>
    <div class="clock-face" role="img">
      ${Array.from({ length: 12 }, (_, index) => {
        const radians = (index + 1) * Math.PI / 6;
        return `<span class="clock-number" style="--x:${50 + Math.sin(radians) * 38}%;--y:${50 - Math.cos(radians) * 38}%">${index + 1}</span>`;
      }).join('')}
      <span class="clock-hand clock-hour"></span><span class="clock-hand clock-minute"></span>
    </div>
  </figure>`;
root.innerHTML = `
  <div class="training-toolbar"><p class="training-progress" id="zeit-round"></p></div>
  <form id="zeit-answer" class="training-board number-training-form">
    <div class="training-stage time-stage">
      <div class="time-task" hidden>
        <p class="training-prompt">Wie viel Zeit ist vergangen?</p>
        <div class="time-clocks">${clockMarkup('Start')}${clockMarkup('Ende')}</div>
        <div class="time-answer">
          <label>Stunden<input name="hours" type="text" inputmode="none" autocomplete="off" maxlength="2" placeholder="0"></label>
          <label>Minuten<input name="minutes" type="text" inputmode="none" autocomplete="off" maxlength="2" placeholder="0"></label>
        </div>
        <p id="zeit-result" class="training-prompt" role="status"></p>
      </div>
    </div>
    <fieldset class="training-controls" aria-label="Nummernblock" disabled>
      <button class="number-training-submit" type="submit">Abgeben</button>
      <button class="number-training-submit" type="button" id="zeit-next" hidden>Weiter</button>
      <div class="training-pad"></div>
    </fieldset>
  </form>
`;

const form = root.querySelector('#zeit-answer');
const clocks = [...root.querySelectorAll('.time-clock')];
const result = root.querySelector('#zeit-result');
const next = root.querySelector('#zeit-next');
const roundLabel = root.querySelector('#zeit-round');
const task = root.querySelector('.time-task');
const stage = root.querySelector('.time-stage');
const controls = form.querySelector('fieldset');
const submit = form.querySelector('[type=submit]');
const pad = form.querySelector('.training-pad');
const inputs = [form.elements.hours, form.elements.minutes];
let activeInput;
let accepting;
const go = addStageAction(stage, showTask);
const session = mountTrainingSession(root, {
  toolbar: root.querySelector('.training-toolbar'), stage, reset: restart,
});
mountNumberPad(pad, () => activeInput);
function selectInput(input) {
  activeInput = input;
  for (const field of inputs) field.toggleAttribute('data-active', field === input);
}
for (const input of inputs) {
  input.addEventListener('focus', () => selectInput(input));
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '');
    submit.disabled = !inputs.some((field) => field.value);
    result.textContent = '';
  });
}

let level, round, score, duration, previousStart, previousDuration;
const random = limit => Math.floor(Math.random() * limit);
const twoDigits = n => String(n).padStart(2, '0');

function renderClock(clock, total) {
  const minutes = total % day;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  clock.querySelector('[data-period]').textContent = (hour < 12 ? '00–11 Uhr' : '12–23 Uhr') +
    (total >= day ? ' · Folgetag' : '');
  clock.querySelector('.clock-face').setAttribute('aria-label',
    `${twoDigits(hour)}:${twoDigits(minute)} Uhr${total >= day ? ' am Folgetag' : ''}`);
  clock.querySelector('.clock-hour').style.setProperty('--angle', `${minutes / 2}deg`);
  clock.querySelector('.clock-minute').style.setProperty('--angle', `${minute * 6}deg`);
}

function showTask() {
  go.hidden = true;
  task.hidden = false;
  session.setRunning(true);
  accepting = true;
  const { step, maxSteps } = settings[level];
  let start, amount;
  do {
    amount = (random(maxSteps) + 1) * step;
    const crossesMidnight = level === 'schwer' && round % 3 === 0;
    start = crossesMidnight ? day - 1 - random(amount) : random((day - amount) / step) * step;
  } while (start === previousStart && amount === previousDuration);
  previousStart = start;
  previousDuration = duration = amount;
  roundLabel.textContent = `Aufgabe ${round} von ${rounds}`;
  renderClock(clocks[0], start);
  renderClock(clocks[1], start + duration);
  form.reset();
  controls.disabled = false;
  for (const key of pad.children) key.disabled = false;
  for (const input of inputs) input.readOnly = false;
  next.hidden = true;
  submit.hidden = false;
  submit.disabled = true;
  result.textContent = '';
  inputs[0].focus({ preventScroll: true });
}

function restart() {
  round = 1;
  score = 0;
  previousStart = previousDuration = undefined;
  accepting = false;
  session.setRunning(false);
  roundLabel.textContent = `Aufgabe 1 von ${rounds}`;
  task.hidden = next.hidden = true;
  controls.disabled = true;
  submit.hidden = false;
  go.hidden = false;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!accepting || submit.disabled) return;
  const hours = inputs[0].value || '0';
  const minutes = inputs[1].value || '0';
  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || Number(minutes) > 59) {
    result.textContent = 'Gib ganze Stunden und 0 bis 59 Minuten ein.';
    return;
  }

  const correct = Number(hours) * 60 + Number(minutes) === duration;
  if (correct) score++;
  const answer = `${Math.floor(duration / 60)} Std. ${duration % 60} Min.`;
  const message = correct ? 'Richtig! ' + answer : 'Richtig wäre: ' + answer;
  accepting = false;
  for (const input of inputs) {
    input.readOnly = true;
    input.removeAttribute('data-active');
  }
  for (const key of pad.children) key.disabled = true;
  submit.hidden = true;
  if (round === rounds) {
    if (score === rounds) markSolved('zeit', level);
    task.hidden = true;
    submit.hidden = false;
    controls.disabled = true;
    session.finish({ detail: 'Letzte Aufgabe · ' + message, metrics: [['Richtig', score + ' / ' + rounds]] });
    return;
  }
  result.textContent = message;
  next.hidden = false;
  next.focus({ preventScroll: true });
});

next.addEventListener('click', () => {
  round++;
  showTask();
});

games.set('zeit', { title: 'Zeit', category: 'training', load(selectedLevel) {
  level = selectedLevel;
  restart();
}, leave: session.leave });
