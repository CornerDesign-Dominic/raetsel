import { showHint } from './puzzle-hint.js';
import { games, levels, markSolved } from './puzzle-levels.js';

const gameId = 'wo-wohne-ich';
const directions = {
  N: { name: 'Norden', arrow: '↑' },
  E: { name: 'Osten', arrow: '→' },
  S: { name: 'Süden', arrow: '↓' },
  W: { name: 'Westen', arrow: '←' },
};
const directionsList = Object.keys(directions);
const roofs = {
  amber: 'gelb',
  russet: 'rot',
  slate: 'graublau',
  moss: 'grün',
};
const landmarks = {
  church: { name: 'Kirche' },
  blueCar: { name: 'Blaues Auto' },
  redCar: { name: 'Rotes Auto' },
  fountain: { name: 'Brunnen' },
  park: { name: 'Park' },
};
const puzzles = {
  leicht: {
    size: 4,
    home: 'B2',
    end: 'A3',
    features: { A1: 'park', A3: 'church', B3: 'blueCar', D2: 'redCar' },
    houses: { A2: { roof: 'amber' }, B2: { door: 'S' }, B4: { door: 'S' } },
    clues: [
      'Von meiner nach Süden zeigenden Haustür ging ich ein Feld geradeaus bis zum blauen Auto.',
      'Am Auto bog ich rechts ab und ging ein Feld weiter. Jetzt stehe ich an der Kirche.',
    ],
    hint: 'Geh von der Kirche ein Feld nach Osten zurück. Dann stehst du am blauen Auto.',
    explanation: 'Von der Kirche gehst du ein Feld nach Osten zum blauen Auto und ein Feld nach Norden nach Hause.',
  },
  mittel: {
    size: 5,
    home: 'D5',
    end: 'E3',
    features: { A2: 'park', B3: 'fountain', B5: 'blueCar', C2: 'redCar', E3: 'church' },
    houses: { C5: { roof: 'amber' }, D5: { door: 'W' }, E4: { door: 'W' } },
    clues: [
      'Meine Haustür zeigt nach Westen. Zwei Felder geradeaus von dort stand das blaue Auto.',
      'Am Auto bog ich rechts ab. Zwei Felder später erreichte ich den Brunnen.',
      'Am Brunnen bog ich wieder rechts ab. Nach drei weiteren Feldern erreichte ich die Kirche.',
    ],
    hint: 'Die letzte Abbiegung war nach Osten. Geh von der Kirche drei Felder in die Gegenrichtung.',
    explanation: 'Geh von der Kirche drei Felder nach Westen zum Brunnen, zwei nach Süden zum blauen Auto und zwei nach Osten nach Hause.',
  },
  schwer: {
    size: 6,
    home: 'E6',
    end: 'F2',
    features: { A4: 'redCar', B2: 'fountain', E4: 'blueCar', F2: 'church', F5: 'park' },
    houses: {
      B4: { roof: 'amber' },
      C4: { roof: 'amber' },
      C6: { door: 'N' },
      E6: { door: 'N' },
    },
    clues: [
      'Ich bin an der Kirche. Auf dem letzten Abschnitt ging ich vier Felder geradeaus vom Brunnen zur Kirche.',
      'Am Brunnen bog ich rechts ab, genau wie zuvor am Haus mit gelbem Dach. Zwischen dem gelben Dach und dem Brunnen lagen zwei Schritte.',
      'Am blauen Auto bog ich links ab. Drei Felder weiter bog ich an dem Haus mit gelbem Dach ab.',
      'Meine Haustür zeigt nach Norden. Von dort ging ich zwei Felder geradeaus bis zum blauen Auto.',
    ],
    hint: 'Vom Brunnen zur Kirche ging es nach Osten. Nach einer Rechtsabbiegung nach Osten muss die vorherige Richtung Norden gewesen sein.',
    explanation: 'Von der Kirche geht es vier Felder westwärts zum Brunnen, zwei südwärts zum gelben Dach, drei ostwärts zum blauen Auto und zwei südwärts nach Hause.',
  },
};

const root = document.querySelector('#map-game');
root.innerHTML = `
  <div class="puzzle-layout where-layout">
    <section class="board where-story" aria-labelledby="where-clues-title">
      <h3 id="where-clues-title">Mein Weg</h3>
      <ol class="where-clues"></ol>
      <p id="where-instructions" hidden>Ein Schritt führt ins benachbarte Feld. Die kleinen Pfeile an den Häusern zeigen, wohin die Haustüren weisen.</p>
    </section>
    <section class="board where-board" aria-labelledby="where-map-title">
      <div class="where-map-heading">
        <h3 id="where-map-title">Karte</h3>
        <span class="where-compass" role="img" aria-label="Norden ist oben"><span aria-hidden="true">↑ N</span></span>
      </div>
      <div class="where-map" role="group" aria-label="Kacheln der Karte" aria-describedby="where-instructions"></div>
      <ul class="where-legend" aria-label="Kartenlegende"></ul>
      <p class="where-selection" role="status"></p>
      <div class="puzzle-actions where-actions">
        <button class="where-solve" type="button" disabled>Lösen</button>
        <button class="icon-button where-hint" type="button" aria-label="Tipp anzeigen" title="Tipp anzeigen" aria-haspopup="dialog" aria-controls="puzzle-hint">
          <svg aria-hidden="true"><use href="#icon-lightbulb"></use></svg>
        </button>
      </div>
    </section>
  </div>
  <dialog class="result-dialog where-result" data-game-result aria-labelledby="where-result-title" aria-describedby="where-result-message">
    <h2 id="where-result-title"></h2>
    <p id="where-result-message" class="where-result-message"></p>
    <form method="dialog">
      <button class="where-result-close" type="submit" autofocus>Schließen</button>
    </form>
  </dialog>
`;

const map = root.querySelector('.where-map');
const clues = root.querySelector('.where-clues');
const legend = root.querySelector('.where-legend');
const selection = root.querySelector('.where-selection');
const solveButton = root.querySelector('.where-solve');
const result = root.querySelector('.where-result');
const resultTitle = root.querySelector('#where-result-title');
const resultMessage = root.querySelector('.where-result-message');
const closeButton = root.querySelector('.where-result-close');
let currentLevel;
let puzzle;
let selected;

function piece(type) {
  const icon = document.createElement('span');
  icon.className = 'where-piece';
  icon.dataset.piece = type;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function makeTile(column, row) {
  const address = String.fromCharCode(65 + column) + (row + 1);
  const feature = puzzle.features[address];
  const tile = document.createElement(feature ? 'span' : 'button');
  tile.className = 'where-tile';

  if (feature) {
    tile.dataset.feature = feature;
    const isEnd = address === puzzle.end;
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', address + ': ' + landmarks[feature].name + (isEnd ? ', Ziel' : ''));
    tile.append(piece(feature));
    if (isEnd) {
      const pin = document.createElement('span');
      pin.className = 'where-goal';
      pin.textContent = 'Ziel';
      pin.setAttribute('aria-hidden', 'true');
      tile.append(pin);
    }
    return tile;
  }

  const house = puzzle.houses[address] ?? {};
  const roof = house.roof ?? ['russet', 'slate', 'moss'][(column * 2 + row) % 3];
  const door = house.door ?? directionsList[(column + row * 3) % 4];
  tile.type = 'button';
  tile.dataset.address = address;
  tile.dataset.roof = roof;
  tile.dataset.door = door;
  tile.setAttribute('aria-label', 'Haus ' + address + ', Dach ' + roofs[roof] + ', Tür nach ' + directions[door].name);
  tile.setAttribute('aria-pressed', 'false');

  const doorArrow = document.createElement('span');
  doorArrow.className = 'where-door';
  doorArrow.textContent = directions[door].arrow;
  doorArrow.setAttribute('aria-hidden', 'true');

  tile.append(piece('house'), doorArrow);
  return tile;
}

function load(level) {
  currentLevel = level;
  puzzle = puzzles[level];
  selected = null;
  solveButton.disabled = true;
  selection.textContent = 'Tippe auf das gesuchte Wohnhaus.';
  map.style.setProperty('--where-size', puzzle.size);

  const heading = document.querySelector('#map-level');
  heading.textContent = levels[level];

  const tiles = [];
  for (let row = 0; row < puzzle.size; row++) {
    for (let column = 0; column < puzzle.size; column++) {
      tiles.push(makeTile(column, row));
    }
  }
  map.replaceChildren(...tiles);
  clues.replaceChildren(...puzzle.clues.map((text) => {
    const clue = document.createElement('li');
    clue.textContent = text;
    return clue;
  }));
  const features = new Set(Object.values(puzzle.features));
  legend.replaceChildren(...Array.from(features, (type) => {
    const item = document.createElement('li');
    item.append(piece(type), landmarks[type].name);
    return item;
  }));
}

function leave() {
  if (result.open) result.close();
}

map.addEventListener('click', (event) => {
  const tile = event.target.closest('button[data-address]');
  if (!tile) return;
  if (selected) selected.setAttribute('aria-pressed', 'false');
  selected = tile;
  selected.setAttribute('aria-pressed', 'true');
  selection.textContent = 'Gewählt: Haus ' + selected.dataset.address;
  solveButton.disabled = false;
});

solveButton.addEventListener('click', () => {
  if (!selected) return;
  const solved = selected.dataset.address === puzzle.home;
  resultTitle.textContent = solved ? 'Hurra, geschafft!' : 'Oh nein!';
  resultMessage.textContent = solved ? puzzle.explanation : 'Gehe von der Kirche aus den Weg rückwärts. Prüfe, an welchem Haus du ankommst.';
  closeButton.textContent = solved ? 'Schließen' : 'Weiter rätseln';
  if (solved) markSolved(gameId, currentLevel);
  result.showModal();
});

root.querySelector('.where-hint').addEventListener('click', () => showHint(puzzle.hint));

games.set(gameId, { title: 'Wo wohne ich?', category: 'logik', load, leave });
