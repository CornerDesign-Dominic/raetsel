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
  explanation: 'Nora kommt um 9 Uhr: Sie kommt vor Leo und nicht um 10 Uhr. Leo kommt um 11 Uhr, weil 10 Uhr für ihn ausscheidet. Mia bleibt 10 Uhr.',
};

// Keep the stored value for a checkmark so existing progress is preserved.
const checkedMark = 2;
const feedback = document.querySelector('#grid-feedback');
const checkButton = document.querySelector('#check-grid');
const hintButton = document.querySelector('#hint-grid');
const undoButton = document.querySelector('#undo-grid');
const resultDialog = document.querySelector('#grid-result');
const resultTitle = document.querySelector('#grid-result-title');
const resultMessage = document.querySelector('#grid-result-message');
const resultClose = document.querySelector('#grid-result-close');
const storageKey = 'inveni:logikgitter:' + puzzle.id;
const size = puzzle.people.length * puzzle.times.length;
let marks = readMarks();
const history = [];
let hintIndex = 0;

function readMarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length === size && saved.every((mark) => Number.isInteger(mark) && mark >= 0 && mark <= checkedMark)) {
      return saved.map((mark) => mark === checkedMark ? checkedMark : 0);
    }
  } catch {
    // Storage can be unavailable in private sessions.
  }
  return Array(size).fill(0);
}

function renderMarks() {
  for (const [index, button] of cells.entries()) {
    const selected = marks[index] === checkedMark;
    button.textContent = selected ? '✓' : '·';
    button.setAttribute('aria-pressed', String(selected));
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
    button.setAttribute('aria-label', person + ', ' + time);
    const index = cells.length;
    button.addEventListener('click', () => {
      history.push([...marks]);
      marks[index] = marks[index] === checkedMark ? 0 : checkedMark;
      feedback.textContent = '';
      renderMarks();
      saveMarks();
    });
    row.insertCell().append(button);
    cells.push(button);
  }
}

checkButton.addEventListener('click', () => {
  const selected = marks.flatMap((mark, index) => mark === checkedMark ? [index] : []);
  const hasContradiction = selected.some((index) => {
    const personIndex = Math.floor(index / puzzle.times.length);
    return index % puzzle.times.length !== puzzle.answer[personIndex];
  });
  const solved = !hasContradiction && selected.length === puzzle.people.length;

  resultTitle.textContent = solved ? 'Hurra, geschafft!' : 'Oh nein!';
  resultClose.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) {
    resultMessage.textContent = puzzle.explanation;
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
