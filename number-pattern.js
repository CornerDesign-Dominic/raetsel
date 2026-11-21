import { showHint } from './puzzle-hint.js';
import { games, levels, markSolved } from './puzzle-levels.js';

const gameId = 'musterfeld';
const rowRule = 'Lies jede Zeile von links nach rechts. Die ersten beiden Zahlen ergeben nach derselben Rechenregel die dritte. Welche Zahl fehlt?';
const puzzles = {
  leicht: {
    rows: [[2, 3, 5], [4, 5, 9], [3, 8, 11], [5, 7, null]],
    answer: 12,
    hint: 'Was ist 2 plus 3? Prüfe anschließend die zweite Zeile.',
    explanation: 'Die dritte Zahl ist die Summe der ersten beiden. In der letzten Zeile ergibt 5 + 7 die 12.',
  },
  mittel: {
    rows: [[2, 5, 9], [3, 4, 10], [1, 8, 10], [4, 6, null]],
    answer: 14,
    hint: 'Zieh in jeder fertigen Zeile die mittlere von der rechten Zahl ab. Was fällt dir am Ergebnis auf?',
    explanation: 'Verdopple die erste Zahl und addiere die zweite. In der letzten Zeile ergibt das 2 × 4 + 6 = 14.',
  },
  schwer: {
    rows: [[6, 2, 32], [7, 3, 40], [5, 4, 9], [8, 3, null]],
    answer: 55,
    hint: 'Bilde aus den ersten beiden Zahlen jeweils ihre Summe und ihre Differenz. Wie kommst du damit auf die dritte Zahl?',
    explanation: 'Multipliziere die Summe der ersten beiden Zahlen mit ihrer Differenz. In der letzten Zeile ergibt das (8 + 3) × (8 − 3) = 55.',
  },
};

const game = document.querySelector('#pattern-game');
const hintButton = document.querySelector('#hint-pattern');
const dialog = document.querySelector('#pattern-result');
const title = document.querySelector('#pattern-result-title');
const message = document.querySelector('#pattern-result-message');
const closeButton = document.querySelector('#pattern-result-close');
const body = document.querySelector('.pattern-grid tbody');
let puzzle;
let currentLevel;
let answerInput;

function load(level) {
  currentLevel = level;
  puzzle = puzzles[level];
  document.querySelector('#pattern-level').textContent = levels[level];
  document.querySelector('#pattern-rule').textContent = rowRule;
  body.replaceChildren();
  for (const [rowIndex, values] of puzzle.rows.entries()) {
    const row = body.insertRow();
    for (const [colIndex, value] of values.entries()) {
      const cell = row.insertCell();
      if (value === null) {
        cell.className = 'pattern-missing';
        answerInput = document.createElement('input');
        answerInput.type = 'text';
        answerInput.inputMode = 'numeric';
        answerInput.autocomplete = 'off';
        answerInput.placeholder = '?';
        answerInput.setAttribute('aria-label', 'Fehlende Zahl in Zeile ' + (rowIndex + 1) + ', Spalte ' + (colIndex + 1));
        cell.append(answerInput);
      } else {
        cell.textContent = value;
      }
    }
  }
}

games.set(gameId, { title: 'Musterfeld', category: 'zahlen-und-muster', load });

game.addEventListener('submit', (event) => {
  event.preventDefault();
  const answer = answerInput.value.trim();
  const isInteger = /^\d+$/.test(answer);
  const solved = isInteger && Number(answer) === puzzle.answer;

  title.textContent = solved ? 'Hurra, geschafft!' : isInteger ? 'Oh nein!' : 'Eine Zahl fehlt';
  closeButton.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) {
    message.textContent = puzzle.explanation;
    markSolved(gameId, currentLevel);
  } else if (isInteger) {
    message.textContent = 'Diese Zahl passt noch nicht. Prüfe deine Regel an den ausgefüllten Feldern.';
  } else {
    message.textContent = 'Trage eine ganze Zahl in das Feld mit dem Fragezeichen ein.';
  }
  dialog.showModal();
});

hintButton.addEventListener('click', () => showHint(puzzle.hint));

window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
});
