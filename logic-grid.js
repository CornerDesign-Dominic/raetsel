const puzzle = {
  id: 'observatorium-1',
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
  explanation: 'Nora kann weder um 10 Uhr noch als Letzte kommen. Also kommt sie um 9 Uhr. Leo kommt nicht um 10 Uhr, daher kommt er um 11 Uhr. Für Mia bleibt 10 Uhr.',
};

const symbols = ['·', '×', '✓'];
const states = ['offen', 'ausgeschlossen', 'zugeordnet'];
const feedback = document.querySelector('#grid-feedback');
const checkButton = document.querySelector('#check-grid');
const hintButton = document.querySelector('#hint-grid');
const undoButton = document.querySelector('#undo-grid');
const storageKey = 'inveni:logikgitter:' + puzzle.id;
const size = puzzle.people.length * puzzle.times.length;
let marks = readMarks();
const history = [];
let hintIndex = 0;

function readMarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length === size && saved.every((mark) => Number.isInteger(mark) && mark >= 0 && mark < symbols.length)) {
      return saved;
    }
  } catch {
    // Storage can be unavailable in private sessions.
  }
  return Array(size).fill(0);
}

function renderMarks() {
  for (const [index, button] of cells.entries()) {
    const mark = marks[index];
    button.textContent = symbols[mark];
    button.dataset.mark = mark;
    const { person, time } = button.dataset;
    button.setAttribute('aria-label', person + ', ' + time + ': ' + states[mark]);
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

const clueList = document.querySelector('#grid-clues');
for (const clue of puzzle.clues) {
  clueList.append(createCell('li', clue));
}

const grid = document.querySelector('.logic-grid');
const headings = grid.createTHead().insertRow();
headings.append(createCell('td', ''));
for (const time of puzzle.times) {
  const label = createCell('th', time);
  label.scope = 'col';
  headings.append(label);
}

const cells = [];
const rows = grid.createTBody();
for (const person of puzzle.people) {
  const row = rows.insertRow();
  const label = createCell('th', person);
  label.scope = 'row';
  row.append(label);

  for (const time of puzzle.times) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.person = person;
    button.dataset.time = time;
    const index = cells.length;
    button.addEventListener('click', () => {
      history.push([...marks]);
      marks[index] = (marks[index] + 1) % symbols.length;
      feedback.textContent = '';
      renderMarks();
      saveMarks();
    });
    row.insertCell().append(button);
    cells.push(button);
  }
}

checkButton.addEventListener('click', () => {
  const positives = marks.filter((mark) => mark === 2).length;
  const hasContradiction = marks.some((mark, index) => {
    const correct = index % puzzle.times.length === puzzle.answer[Math.floor(index / puzzle.times.length)];
    return (mark === 2 && !correct) || (mark === 1 && correct);
  });

  if (hasContradiction) {
    feedback.textContent = 'Mindestens eine Markierung widerspricht den Hinweisen. Schau dir deine Zuordnungen und Ausschlüsse noch einmal an.';
  } else if (positives < puzzle.people.length) {
    feedback.textContent = 'Setze ein ✓ für jede Person, um deine Lösung zu prüfen.';
  } else {
    feedback.textContent = 'Gelöst! ' + puzzle.explanation;
  }
});

hintButton.addEventListener('click', () => {
  feedback.textContent = puzzle.hints[hintIndex];
  hintIndex = (hintIndex + 1) % puzzle.hints.length;
});

undoButton.addEventListener('click', () => {
  if (history.length === 0) return;
  marks = history.pop();
  feedback.textContent = '';
  renderMarks();
  saveMarks();
});

renderMarks();
