export const levels = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
export const games = new Map();

const solvedKey = 'inveni:solved';
const draftPrefixes = ['inveni:logikgitter:', 'inveni:sudoku:'];
const difficulty = document.querySelector('#difficulty-dialog');
const choices = difficulty.querySelector('.difficulty-choices');
const reset = document.querySelector('#reset-dialog');
const resetStatus = document.querySelector('#reset-status');
let pendingGame = '';

function readSolved() {
  try {
    const saved = JSON.parse(localStorage.getItem(solvedKey));
    return new Set(Array.isArray(saved) ? saved.map(entry =>
      typeof entry === 'string' && entry.startsWith('busfahrt/') ? 'haus/' + entry.slice('busfahrt/'.length) : entry) : []);
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

export function chooseDifficulty(gameId, game) {
  pendingGame = gameId;
  difficulty.querySelector('#difficulty-title').textContent = game.chooserTitle ?? 'Schwierigkeit wählen';
  difficulty.querySelector('#difficulty-game').textContent = game.title;
  const options = Object.entries(game.options ?? levels);
  choices.replaceChildren(...options.map(([level, label], index) => {
    const button = document.createElement('button');
    const done = solved.has(gameId + '/' + level);
    button.type = 'button';
    button.autofocus = index === 0;
    button.textContent = label + (done ? ' ✓' : '');
    button.setAttribute('aria-label', label + (done ? ', gelöst' : ''));
    button.addEventListener('click', () => {
      window.location.hash = gameId + '/' + level;
    });
    return button;
  }));
  if (!difficulty.open) difficulty.showModal();
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
      if (draftPrefixes.some(prefix => key?.startsWith(prefix))) localStorage.removeItem(key);
    }
    resetStatus.textContent = 'Spielstand zurückgesetzt.';
  } catch {
    resetStatus.textContent = 'Der gespeicherte Spielstand konnte nicht gelöscht werden.';
  }
});
