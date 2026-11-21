import { showHint } from './puzzle-hint.js';
import { games, levels, markSolved } from './puzzle-levels.js';

const game = 'logikgitter';
const puzzles = {
  leicht: {
    id: 'observatorium-1',
    title: 'Besuch im Observatorium',
    intro: 'Mia, Nora und Leo besuchen das Observatorium zu drei verschiedenen Zeiten. Wer kommt wann?',
    people: ['Mia', 'Nora', 'Leo'],
    times: ['9 Uhr', '10 Uhr', '11 Uhr'],
    clues: [
      'Nora kommt vor Leo.',
      'Nora kommt nicht um 10 Uhr.',
      'Leo kommt nicht um 10 Uhr.',
    ],
    hints: [
      'Vergleiche Hinweis 1 und 2. Kann Nora als Letzte kommen?',
      'Für Nora fallen 10 und 11 Uhr weg. Welche Zeit bleibt ihr?',
      'Für Leo und Mia bleiben 10 und 11 Uhr. Was sagt Hinweis 3 über Leo?',
    ],
    answer: [1, 0, 2],
    explanation: 'Nora kommt um 9 Uhr: Sie kommt vor Leo und nicht um 10 Uhr. Leo kommt um 11 Uhr, weil 10 Uhr für ihn ausscheidet. Mia bleibt 10 Uhr.',
  },
  mittel: {
    id: 'sternwarte-zeiten',
    title: 'Termine in der Sternwarte',
    intro: 'Ava, Ben, Cem und Doro haben je einen Termin in der Sternwarte. Wer kommt wann?',
    people: ['Ava', 'Ben', 'Cem', 'Doro'],
    times: ['9 Uhr', '10 Uhr', '11 Uhr', '12 Uhr'],
    clues: [
      'Doro hat ihren Termin direkt nach Ava.',
      'Ava kommt vor Ben. Zwischen ihren Terminen liegt genau ein weiterer Termin.',
      'Cem kommt nach Ben.',
    ],
    hints: [
      'Ordne zuerst Ava, Ben und Cem. Welche Reihenfolge geben Hinweise 2 und 3 vor?',
      'Wo muss Doro stehen, damit sie direkt nach Ava kommt und noch vor Ben dran ist?',
    ],
    answer: [0, 2, 3, 1],
    explanation: 'Doro kommt direkt nach Ava und füllt die Lücke vor Ben. Cem kommt danach. Die Reihenfolge ist also Ava (9 Uhr), Doro (10 Uhr), Ben (11 Uhr), Cem (12 Uhr).',
  },
  schwer: {
    id: 'nacht-der-sterne-zeiten',
    title: 'Die Nacht der Sterne',
    intro: 'Ada, Ben, Cem, Dana und Eli haben je einen Termin am Teleskop. Wer kommt wann?',
    people: ['Ada', 'Ben', 'Cem', 'Dana', 'Eli'],
    times: ['9 Uhr', '10 Uhr', '11 Uhr', '12 Uhr', '13 Uhr'],
    clues: [
      'Mehr Personen kommen vor Eli als nach Eli. Eli hat aber nicht den letzten Termin.',
      'Adas und Elis Termine liegen genau zwei Stunden auseinander.',
      'Ben kommt vor Cem. Zwischen ihren Terminen liegt genau ein weiterer Termin.',
      'Vor Dana kommen doppelt so viele Personen wie vor Cem.',
    ],
    hints: [
      'Zähle für jeden möglichen Termin von Eli, wie viele Personen davor und danach kommen.',
      'Sobald Eli und Ada feststehen, bleiben für Ben und Cem zwei mögliche Paare. Prüfe für beide den Hinweis zu Dana.',
    ],
    answer: [1, 0, 2, 4, 3],
    explanation: 'Eli muss der vierte sein, Ada zwei Stunden früher. Ben und Cem könnten den ersten und dritten oder den dritten und fünften Termin haben. Nur beim ersten Paar passt Dana an die fünfte Stelle: Vor ihr kommen vier Personen, vor Cem zwei.',
  },
};

// Keep the stored value for a checkmark so existing progress is preserved.
const checkedMark = 2;
const checkButton = document.querySelector('#check-grid');
const hintButton = document.querySelector('#hint-grid');
const undoButton = document.querySelector('#undo-grid');
const resultDialog = document.querySelector('#grid-result');
const resultTitle = document.querySelector('#grid-result-title');
const resultMessage = document.querySelector('#grid-result-message');
const resultClose = document.querySelector('#grid-result-close');
const tableContainer = document.querySelector('#logic-tables');
const clueList = document.querySelector('#grid-clues');
const ruleList = document.querySelector('#grid-rules');
let puzzle;
let currentLevel;
let storageKey;
let marks;
let cells;
let hintIndex;
const history = [];

function readMarks(size) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length === size) {
      return saved.map((mark) => mark === checkedMark ? checkedMark : 0);
    }
  } catch {
    // Storage can be unavailable in private sessions.
  }
  return Array(size).fill(0);
}

function renderMarks() {
  for (const [index, cell] of cells.entries()) {
    const selected = marks[index] === checkedMark;
    cell.button.textContent = selected ? '✓' : '·';
    cell.button.setAttribute('aria-pressed', String(selected));
  }
  undoButton.disabled = history.length === 0;
}

function saveMarks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(marks));
  } catch {
    // The puzzle remains playable for this session.
  }
}

function createCell(tag, content) {
  const cell = document.createElement(tag);
  cell.textContent = content;
  return cell;
}

function createGrid() {
  const grid = document.createElement('table');
  grid.className = 'logic-grid';
  grid.setAttribute('aria-describedby', 'grid-rules');
  grid.createCaption().textContent = 'Person und Uhrzeit';
  const headings = grid.createTHead().insertRow();
  headings.append(createCell('td', ''));
  for (const time of puzzle.times) {
    const label = createCell('th', time);
    label.scope = 'col';
    headings.append(label);
  }

  const rows = grid.createTBody();
  for (const [personIndex, person] of puzzle.people.entries()) {
    const row = rows.insertRow();
    const label = createCell('th', person);
    label.scope = 'row';
    row.append(label);
    for (const [timeIndex, time] of puzzle.times.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', person + ', ' + time);
      const index = cells.length;
      button.addEventListener('click', () => {
        history.push([...marks]);
        marks[index] = marks[index] === checkedMark ? 0 : checkedMark;
        renderMarks();
        saveMarks();
      });
      row.insertCell().append(button);
      cells.push({ button, correct: puzzle.answer[personIndex] === timeIndex });
    }
  }
  return grid;
}

function load(level) {
  puzzle = puzzles[level];
  currentLevel = level;
  storageKey = 'inveni:logikgitter:' + puzzle.id;
  history.length = 0;
  hintIndex = 0;
  cells = [];
  document.querySelector('#grid-level').textContent = 'Logikgitter · ' + levels[level];
  document.querySelector('#grid-title').textContent = puzzle.title;
  document.querySelector('#grid-intro').textContent = puzzle.intro;
  clueList.replaceChildren(...puzzle.clues.map((clue) => createCell('li', clue)));
  ruleList.replaceChildren(
    createCell('li', 'Jede Person kommt genau einmal.'),
    createCell('li', 'Jede Uhrzeit gehört genau einer Person.'),
    createCell('li', 'Tippe auf ein Feld, um einen Haken zu setzen oder zu entfernen.'),
  );

  tableContainer.replaceChildren(createGrid());
  marks = readMarks(cells.length);
  renderMarks();
}

games.set(game, { title: 'Logikgitter', category: 'logik', load });

checkButton.addEventListener('click', () => {
  const selected = marks.flatMap((mark, index) => mark === checkedMark ? [cells[index]] : []);
  const hasContradiction = selected.some((cell) => !cell.correct);
  const solved = !hasContradiction && selected.length === puzzle.people.length;

  resultTitle.textContent = solved ? 'Hurra, geschafft!' : 'Oh nein!';
  resultClose.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) {
    resultMessage.textContent = puzzle.explanation;
    markSolved(game, currentLevel);
  } else if (hasContradiction) {
    resultMessage.textContent = 'Mindestens ein Haken passt nicht zu den Hinweisen. Schau dir deine Zuordnungen noch einmal an.';
  } else {
    resultMessage.textContent = 'Deine Lösung ist noch offen. Setze für jede Person einen Haken.';
  }
  resultDialog.showModal();
});

window.addEventListener('hashchange', () => {
  if (resultDialog.open) resultDialog.close();
});

hintButton.addEventListener('click', () => {
  showHint(puzzle.hints[hintIndex]);
  hintIndex = (hintIndex + 1) % puzzle.hints.length;
});

undoButton.addEventListener('click', () => {
  if (history.length === 0) return;
  marks = history.pop();
  renderMarks();
  saveMarks();
});
