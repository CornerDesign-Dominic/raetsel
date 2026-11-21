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
    answers: [[1, 0, 2]],
    explanation: 'Nora kommt um 9 Uhr: Sie kommt vor Leo und nicht um 10 Uhr. Leo kommt um 11 Uhr, weil 10 Uhr für ihn ausscheidet. Mia bleibt 10 Uhr.',
  },
  mittel: {
    id: 'sternwarte-2',
    title: 'Termine in der Sternwarte',
    intro: 'Ava, Ben und Cem haben je einen Termin. Ordne jeder Person Uhrzeit und Ort zu.',
    people: ['Ava', 'Ben', 'Cem'],
    times: ['9 Uhr', '10 Uhr', '11 Uhr'],
    places: ['Turm', 'Hof', 'Saal'],
    clues: [
      'Der Termin im Turm findet direkt vor dem im Hof statt.',
      'Der Termin im Hof findet vor dem im Saal statt.',
      'Ben hat seinen Termin weder im Turm noch im Saal.',
      'Ava hat vor Cem ihren Termin.',
    ],
    hints: ['Bringe zuerst die drei Orte in eine Reihenfolge.', 'Welcher Ort und welche Zeit bleiben Ben?'],
    answers: [[0, 1, 2], [0, 1, 2]],
    explanation: 'Die Reihenfolge der Orte ist Turm, Hof, Saal. Ben ist um 10 Uhr im Hof. Ava kommt vor Cem und ist deshalb um 9 Uhr im Turm. Cem kommt um 11 Uhr in den Saal.',
  },
  schwer: {
    id: 'nacht-der-sterne',
    title: 'Die Nacht der Sterne',
    intro: 'Vier Personen, vier Termine, vier Orte. Wer ist wann wo?',
    people: ['Ada', 'Ben', 'Cem', 'Dana'],
    times: ['9 Uhr', '10 Uhr', '11 Uhr', '12 Uhr'],
    places: ['Hof', 'Saal', 'Turm', 'Zelt'],
    clues: [
      'Der Termin im Turm findet direkt vor dem im Saal statt.',
      'Der Termin im Hof findet vor dem im Turm statt.',
      'Der Termin im Zelt findet nicht um 12 Uhr statt.',
      'Der Termin im Hof findet nicht um 10 Uhr statt.',
      'Ada hat ihren Termin im Turm oder im Hof.',
      'Ben hat seinen Termin direkt nach Dana.',
      'Cem hat seinen Termin weder im Hof noch im Turm.',
      'Dana hat ihren Termin vor Ada.',
    ],
    hints: ['Kann der Saal um 11 Uhr an der Reihe sein? Welche Uhrzeit bliebe dann für das Zelt?', 'Dana ist vor Ada dran. Kann Ada dann im Hof sein?'],
    answers: [[2, 1, 3, 0], [2, 3, 1, 0]],
    explanation: 'Die Orte folgen in der Reihenfolge Hof, Zelt, Turm, Saal. Ada muss um 11 Uhr in den Turm, weil Dana vor ihr kommt. Dana ist um 9 Uhr im Hof, Ben um 10 Uhr im Zelt und Cem um 12 Uhr im Saal.',
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

function createGrid(values, answer, caption) {
  const grid = document.createElement('table');
  grid.className = 'logic-grid';
  grid.setAttribute('aria-describedby', 'grid-rules');
  grid.createCaption().textContent = caption;
  const headings = grid.createTHead().insertRow();
  headings.append(createCell('td', ''));
  for (const value of values) {
    const label = createCell('th', value);
    label.scope = 'col';
    headings.append(label);
  }

  const rows = grid.createTBody();
  for (const [personIndex, person] of puzzle.people.entries()) {
    const row = rows.insertRow();
    const label = createCell('th', person);
    label.scope = 'row';
    row.append(label);
    for (const [valueIndex, value] of values.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', person + ', ' + value);
      const index = cells.length;
      button.addEventListener('click', () => {
        history.push([...marks]);
        marks[index] = marks[index] === checkedMark ? 0 : checkedMark;
        renderMarks();
        saveMarks();
      });
      row.insertCell().append(button);
      cells.push({ button, correct: answer[personIndex] === valueIndex });
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
    createCell('li', puzzle.places ? 'Jede Uhrzeit und jeder Ort gehören genau einer Person.' : 'Jede Uhrzeit gehört genau einer Person.'),
    createCell('li', 'Tippe auf ein Feld, um einen Haken zu setzen oder zu entfernen.'),
  );

  const grids = [createGrid(puzzle.times, puzzle.answers[0], 'Person und Uhrzeit')];
  if (puzzle.places) grids.push(createGrid(puzzle.places, puzzle.answers[1], 'Person und Ort'));
  tableContainer.replaceChildren(...grids);
  marks = readMarks(cells.length);
  renderMarks();
}

games.set(game, { title: 'Logikgitter', category: 'logik', load });

checkButton.addEventListener('click', () => {
  const selected = marks.flatMap((mark, index) => mark === checkedMark ? [cells[index]] : []);
  const hasContradiction = selected.some((cell) => !cell.correct);
  const solved = !hasContradiction && selected.length === puzzle.people.length * puzzle.answers.length;

  resultTitle.textContent = solved ? 'Hurra, geschafft!' : 'Oh nein!';
  resultClose.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) {
    resultMessage.textContent = puzzle.explanation;
    markSolved(game, currentLevel);
  } else if (hasContradiction) {
    resultMessage.textContent = 'Mindestens ein Haken passt nicht zu den Hinweisen. Schau dir deine Zuordnungen noch einmal an.';
  } else {
    resultMessage.textContent = 'Deine Lösung ist noch offen. Setze für jede Person in jedem Gitter einen Haken.';
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
