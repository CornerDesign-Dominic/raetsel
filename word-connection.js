import { showHint } from './puzzle-hint.js';
import { games, levels, markSolved } from './puzzle-levels.js';

const gameId = 'wortverbindung';
const puzzles = {
  leicht: {
    folder: 'wortverbindung',
    clues: ['Wachs', 'Docht', 'Flamme'],
    options: [
      ['taschenlampe', 'Längliches grünes Gehäuse mit Schalter und runder Linse'],
      ['kerze', 'Stehender gelber Zylinder auf einem Teller mit einer Flamme oben'],
      ['streichhoelzer', 'Schachtel mit dünnen Hölzchen und roten Spitzen'],
      ['batterie', 'Zwei kleine Metallzylinder mit einem Pluszeichen'],
    ],
    answer: 'kerze',
    hint: 'Beim Brennen schmilzt ein Teil davon.',
    explanation: 'Bei einer Kerze zieht der Docht geschmolzenes Wachs nach oben und hält so die Flamme am Brennen.',
  },
  mittel: {
    folder: 'sonnenzeit',
    clues: ['Ortszeit', 'Teilstriche', 'Schatten'],
    options: [
      ['kompass', 'Rundes Metallgehäuse mit Strichen am Rand und zweifarbiger Nadel'],
      ['sextant', 'Messingrahmen mit gebogener Skala, beweglichem Zeiger und kleinem Fernrohr'],
      ['sonnenuhr', 'Runde Platte mit Strichen und einem dreieckigen Aufsatz, der einen Schatten wirft'],
      ['sanduhr', 'Zwei verbundene Glaskammern, zwischen denen Sand rieselt'],
    ],
    answer: 'sonnenuhr',
    hint: 'Nachts bleibt sie stehen.',
    explanation: 'Bei einer Sonnenuhr zeigt der Schatten auf den Teilstrichen die örtliche Sonnenzeit an.',
  },
  schwer: {
    folder: 'wortverbindung',
    clues: ['Fuge', 'Takt', 'Pfeifen'],
    options: [
      ['orgel', 'Großes Holzgehäuse mit Tasten und unterschiedlich langen Metallrohren'],
      ['metronom', 'Dreieckiges Holzgehäuse mit Skala und schwingendem Zeiger'],
      ['mauer', 'Übereinander angeordnete rote Ziegel mit hellen Zwischenräumen'],
      ['pfeife', 'Kleines Metallgehäuse mit Mundstück und Ring'],
    ],
    answer: 'orgel',
    hint: 'Mit „Fuge“ ist hier eine musikalische Form gemeint.',
    explanation: 'Eine Fuge kann man im Takt auf einer Orgel spielen. Ihre Töne entstehen durch Luft, die durch Pfeifen strömt.',
  },
};

const game = document.querySelector('#word-game');
const hintButton = document.querySelector('#hint-word');
const dialog = document.querySelector('#word-result');
const title = document.querySelector('#word-result-title');
const message = document.querySelector('#word-result-message');
const closeButton = document.querySelector('#word-result-close');
const clues = document.querySelector('.word-clues');
const grid = document.querySelector('.word-grid');
let puzzle;
let currentLevel;

function load(level) {
  puzzle = puzzles[level];
  currentLevel = level;
  document.querySelector('#word-level').textContent = levels[level];
  clues.replaceChildren(...puzzle.clues.map((clue) => {
    const li = document.createElement('li');
    li.textContent = clue;
    return li;
  }));
  grid.replaceChildren(...puzzle.options.map(([id, description]) => {
    const label = document.createElement('label');
    label.className = 'word-image';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'word-answer';
    radio.value = id;
    const image = document.createElement('img');
    image.src = './images/' + puzzle.folder + '/' + id + '.webp';
    image.alt = description;
    image.width = 360;
    image.height = 272;
    label.append(radio, image);
    return label;
  }));
}

games.set(gameId, { title: 'Wortverbindung', category: 'sprache', load });

game.addEventListener('submit', (event) => {
  event.preventDefault();
  const answer = new FormData(game).get('word-answer');
  const solved = answer === puzzle.answer;

  title.textContent = solved ? 'Hurra, geschafft!' : answer ? 'Oh nein!' : 'Wähle ein Bild';
  closeButton.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) {
    message.textContent = puzzle.explanation;
    markSolved(gameId, currentLevel);
  } else if (answer) {
    message.textContent = 'Welches Bild passt zu allen drei Hinweisen? Schau dir die Begriffe noch einmal zusammen an.';
  } else {
    message.textContent = 'Tippe auf das Bild, das deiner Meinung nach zu allen drei Begriffen passt.';
  }
  dialog.showModal();
});

hintButton.addEventListener('click', () => showHint(puzzle.hint));

window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
});
