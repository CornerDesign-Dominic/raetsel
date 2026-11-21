export const levels = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
export const games = new Map();

const solvedKey = 'inveni:solved';
const draftPrefix = 'inveni:logikgitter:';
const difficulty = document.querySelector('#difficulty-dialog');
const choices = [...difficulty.querySelectorAll('[data-level]')];
const reset = document.querySelector('#reset-dialog');
const resetStatus = document.querySelector('#reset-status');
let pendingGame = '';

function readSolved() {
  try {
    const saved = JSON.parse(localStorage.getItem(solvedKey));
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

let solved = readSolved();

export function markSolved(game, level) {
  for (const entry of readSolved()) solved.add(entry);
  solved.add(game + '/' + level);
  try {
    localStorage.setItem(solvedKey, JSON.stringify([...solved]));
  } catch {
    // Completion can still be shown during the current session.
  }
}

export function chooseDifficulty(game, title) {
  pendingGame = game;
  difficulty.querySelector('#difficulty-game').textContent = title;
  for (const button of choices) {
    const level = button.dataset.level;
    const done = solved.has(game + '/' + level);
    button.textContent = levels[level] + (done ? ' ✓' : '');
    button.setAttribute('aria-label', levels[level] + (done ? ', gelöst' : ''));
  }
  if (!difficulty.open) difficulty.showModal();
}

for (const button of choices) {
  button.addEventListener('click', () => {
    window.location.hash = pendingGame + '/' + button.dataset.level;
  });
}

export function closeDifficulty() {
  if (difficulty.open) difficulty.close();
}

function cancelDifficulty() {
  window.location.hash = games.get(pendingGame).category;
}

difficulty.querySelector('#cancel-difficulty').addEventListener('click', cancelDifficulty);
difficulty.addEventListener('cancel', (event) => {
  event.preventDefault();
  cancelDifficulty();
});

document.querySelector('#reset-progress').addEventListener('click', () => reset.showModal());
document.querySelector('#confirm-reset').addEventListener('click', () => {
  solved.clear();
  try {
    localStorage.removeItem(solvedKey);
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(draftPrefix)) localStorage.removeItem(key);
    }
    resetStatus.textContent = 'Spielstand zurückgesetzt.';
  } catch {
    resetStatus.textContent = 'Der gespeicherte Spielstand konnte nicht gelöscht werden.';
  }
});
