import { showHint } from './puzzle-hint.js';
import { games, levels, markSolved } from './puzzle-levels.js';

const gameId = 'musterfeld';
const rowRule = 'In jeder Zeile ergeben die ersten beiden Zahlen nach derselben Rechenregel die dritte. Welche Zahl fehlt?';
const puzzles = {
  leicht: {
    rule: rowRule,
    rows: [[2, 3, 5], [4, 5, 9], [3, 8, 11], [5, 7, null]],
    answer: 12,
    hint: 'Was ist 2 plus 3? Prüfe anschließend die zweite Zeile.',
    explanation: 'Die dritte Zahl ist die Summe der ersten beiden. In der letzten Zeile ergibt 5 + 7 die 12.',
  },
  mittel: {
    rule: rowRule,
    rows: [[2, 5, 9], [3, 4, 10], [1, 8, 10], [4, 6, null]],
    answer: 14,
    hint: 'Zieh in jeder fertigen Zeile die mittlere von der rechten Zahl ab. Was fällt dir am Ergebnis auf?',
    explanation: 'Verdopple die erste Zahl und addiere die zweite. In der letzten Zeile ergibt das 2 × 4 + 6 = 14.',
  },
  schwer: {
    rule: 'Lies das Raster von oben nach unten. In jeder Spalte entsteht die dritte Zahl nach einer gemeinsamen Regel und die vierte nach einer zweiten. Der Strich verdeckt einen Zwischenschritt. Welche Zahl gehört zum Fragezeichen?',
    rows: [[2, 3, 5, 4], [7, 4, 6, 8], [9, 7, 11, '—'], [18, 21, 55, null]],
    answer: 48,
    hint: 'Wie entsteht aus 2 und 7 die 9? Welche zwei Zahlen aus derselben Spalte ergeben zusammen als Produkt die 18?',
    explanation: 'Addiere oben 4 + 8 = 12 für den verdeckten Zwischenschritt. Multipliziere ihn mit der obersten Zahl: 4 × 12 = 48.',
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
  document.querySelector('#pattern-rule').textContent = puzzle.rule;
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
        if (value === '—') {
          cell.className = 'pattern-intermediate';
          cell.setAttribute('aria-label', 'Verdeckter Zwischenschritt');
        }
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
