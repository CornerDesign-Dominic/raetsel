import { games, levels, markSolved } from './puzzle-levels.js';
import { showHint } from './puzzle-hint.js';

const size = 9;
const puzzles = {
  leicht: [
    '081007903', '043001250', '907000801',
    '035400610', '260805079', '070003580',
    '008062090', '090504000', '000100006',
  ],
  mittel: [
    '000000098', '090563102', '203000567',
    '000201000', '020830000', '460000080',
    '380400059', '040090020', '000000004',
  ],
  schwer: [
    '900000010', '000001700', '000047065',
    '003000000', '016075300', '450030200',
    '040000106', '000400080', '000083070',
  ],
};

const solutions = {
  leicht: '581247963643981257927356841835479612264815379179623584318762495796534128452198736',
  mittel: '654172398798563142213984567835241976927836415461759283382417659546398721179625834',
  schwer: '975362814684591732132847965893124657216975348457638291348759126729416583561283479',
};

const grid = document.querySelector('#sudoku-grid');
const status = document.querySelector('#sudoku-status');
const result = document.querySelector('#sudoku-result');
const numberPad = document.querySelector('#sudoku-pad');
const erase = document.querySelector('#sudoku-erase');
const hint = document.querySelector('#sudoku-hint');
const undo = document.querySelector('#sudoku-undo');
const moves = [];
const digits = Array.from({ length: size }, (_, index) => index + 1);
let givens, values, selected, storageKey, level;

const rowOf = index => Math.floor(index / size);
const columnOf = index => index % size;
const boxOf = index => Math.floor(rowOf(index) / 3) * 3 + Math.floor(columnOf(index) / 3);
const shareGroup = (a, b) => rowOf(a) === rowOf(b) || columnOf(a) === columnOf(b) || boxOf(a) === boxOf(b);

const cells = Array.from({ length: size * size }, (_, index) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'sudoku-cell';
  cell.addEventListener('click', () => select(index));
  return cell;
});
grid.append(...cells);

const keys = digits.map(digit => {
  const key = document.createElement('button');
  key.type = 'button';
  key.textContent = digit;
  key.addEventListener('click', () => enter(digit));
  return key;
});
numberPad.prepend(...keys);
erase.addEventListener('click', () => enter(0));

function conflictsAt(index) {
  return values[index] !== 0 && values.some((value, other) =>
    other !== index && value === values[index] && shareGroup(index, other));
}

function render() {
  for (const [index, cell] of cells.entries()) {
    const value = values[index];
    const given = givens[index] !== 0;
    const conflict = conflictsAt(index);
    cell.textContent = value || '';
    cell.tabIndex = index === selected ? 0 : -1;
    cell.classList.toggle('is-given', given);
    cell.classList.toggle('is-peer', shareGroup(index, selected));
    cell.classList.toggle('is-conflict', conflict);
    cell.setAttribute('aria-pressed', index === selected);
    cell.setAttribute('aria-label', 'Zeile ' + (rowOf(index) + 1) + ', Spalte ' + (columnOf(index) + 1) +
      ', ' + (value || 'leer') + (given ? ', vorgegeben' : '') + (conflict ? ', doppelt' : ''));
  }
  const fixed = givens[selected] !== 0;
  for (const key of keys) key.disabled = fixed;
  erase.disabled = fixed || values[selected] === 0;
  hint.disabled = fixed;
  undo.disabled = moves.length === 0;
}

function select(index) {
  selected = index;
  status.textContent = givens[index] ? 'Diese Zahl ist vorgegeben.' : '';
  render();
}

function save() {
  try {
    localStorage.setItem(storageKey, values.join(''));
  } catch {
    // The current puzzle remains playable without storage.
  }
}

function enter(value) {
  if (givens[selected] || values[selected] === value) return;
  moves.push({ index: selected, previous: values[selected] });
  values[selected] = value;
  status.textContent = conflictsAt(selected) ? 'Diese Zahl steht schon im selben Bereich.' : '';
  render();
  save();
}

hint.addEventListener('click', () => {
  const number = solutions[level][selected];
  showHint(`In Zeile ${rowOf(selected) + 1}, Spalte ${columnOf(selected) + 1} gehört die ${number}.`);
});

undo.addEventListener('click', () => {
  const move = moves.pop();
  if (!move) return;
  values[move.index] = move.previous;
  selected = move.index;
  status.textContent = 'Letzten Zug rückgängig gemacht.';
  render();
  save();
  if (undo.disabled) cells[selected].focus({ preventScroll: true });
});

grid.addEventListener('keydown', event => {
  const digit = digits.find(number => String(number) === event.key);
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const direction = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
  }[event.key];
  if (direction) {
    event.preventDefault();
    const [dy, dx] = direction;
    const row = Math.max(0, Math.min(size - 1, rowOf(selected) + dy));
    const column = Math.max(0, Math.min(size - 1, columnOf(selected) + dx));
    select(row * size + column);
    cells[selected].focus({ preventScroll: true });
  } else if (digit || event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault();
    enter(digit ?? 0);
  }
});

document.querySelector('#sudoku-check').addEventListener('click', () => {
  if (values.some((_, index) => conflictsAt(index))) {
    status.textContent = 'Prüfe die markierten doppelten Zahlen.';
  } else if (values.includes(0)) {
    status.textContent = 'Es sind noch Felder frei.';
  } else {
    status.textContent = '';
    markSolved('sudoku', level);
    if (!result.open) result.showModal();
  }
});

games.set('sudoku', {
  title: 'Sudoku',
  category: 'raetsel',
  load(selectedLevel) {
    level = selectedLevel;
    storageKey = 'inveni:sudoku:' + level;
    givens = [...puzzles[level].join('')].map(Number);
    let saved = '';
    try {
      saved = localStorage.getItem(storageKey) ?? '';
    } catch {
      // The puzzle can still be played without storage.
    }
    values = /^\d{81}$/.test(saved) ? givens.map((given, index) => given || Number(saved[index])) : [...givens];
    selected = givens.indexOf(0);
    moves.length = 0;
    status.textContent = '';
    document.querySelector('#sudoku-level').textContent = levels[level];
    render();
  },
  leave() {
    if (result.open) result.close();
  },
});
