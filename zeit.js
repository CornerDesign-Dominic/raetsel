import { games, markSolved } from './puzzle-levels.js';

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
  <p class="training-round" id="zeit-round"></p>
  <p class="training-prompt">Wie viel Zeit ist vergangen?</p>
  <div class="time-clocks" id="zeit-clocks">${clockMarkup('Start')}${clockMarkup('Ende')}</div>
  <form id="zeit-answer" class="time-answer">
    <label>Stunden<input name="hours" type="text" inputmode="numeric" autocomplete="off" maxlength="2" value="0" required></label>
    <label>Minuten<input name="minutes" type="text" inputmode="numeric" autocomplete="off" maxlength="2" value="0" required></label>
    <button type="submit">Lösen</button>
  </form>
  <p id="zeit-result" class="training-prompt" role="status"></p>
  <button type="button" id="zeit-next" hidden>Nächste Aufgabe</button>
`;

const form = root.querySelector('#zeit-answer');
const clocks = [...root.querySelectorAll('.time-clock')];
const result = root.querySelector('#zeit-result');
const next = root.querySelector('#zeit-next');
const roundLabel = root.querySelector('#zeit-round');
const question = root.querySelector('.training-prompt');

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
  form.hidden = false;
  question.hidden = false;
  next.hidden = true;
  result.textContent = '';
}

function restart() {
  round = 1;
  score = 0;
  previousStart = previousDuration = undefined;
  showTask();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (form.hidden) return;
  const hours = form.elements.hours.value.trim();
  const minutes = form.elements.minutes.value.trim();
  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || Number(minutes) > 59) {
    result.textContent = 'Gib ganze Stunden und 0 bis 59 Minuten ein.';
    return;
  }

  const correct = Number(hours) * 60 + Number(minutes) === duration;
  if (correct) score++;
  const answer = `${Math.floor(duration / 60)} Std. ${duration % 60} Min.`;
  let message = correct ? 'Richtig! ' + answer : 'Richtig wäre: ' + answer;
  if (round === rounds) {
    if (score === rounds) markSolved('zeit', level);
    message += ` · ${score} von ${rounds} richtig.`;
  }
  form.hidden = true;
  question.hidden = true;
  result.textContent = message;
  next.textContent = round === rounds ? 'Noch einmal' : 'Nächste Aufgabe';
  next.hidden = false;
  next.focus({ preventScroll: true });
});

next.addEventListener('click', () => {
  if (round === rounds) restart();
  else {
    round++;
    showTask();
  }
  form.elements.hours.focus({ preventScroll: true });
});

games.set('zeit', { title: 'Zeit', category: 'training', load(selectedLevel) {
  level = selectedLevel;
  restart();
} });
