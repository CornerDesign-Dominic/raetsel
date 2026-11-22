const overviewNav = document.querySelector('#overview-nav');
const overviewLinks = [...overviewNav.querySelectorAll('a')];
const headerTitle = document.querySelector('#app-title');
const back = document.querySelector('#app-back');
const openRules = document.querySelector('#app-rules');
const rules = document.querySelector('#rules-dialog');
const rulesGame = document.querySelector('#rules-game');
const list = document.querySelector('#rules-list');
const main = document.querySelector('main');
let playView;
let ruleRoute;
let frame;

const ruleContent = {
  logikgitter: () => [
    ...Array.from(document.querySelectorAll('#grid-rules li'), (item) => item.textContent),
    document.querySelector('#grid-intro').textContent,
  ],
  schatten: () => [
    'Vergleiche den Umriss des Objekts mit den vier Schatten und tippe auf den passenden.',
    'Bei einem falschen Tipp kannst du einen anderen Schatten wählen.',
  ],
  sudoku: () => [
    'Setze die Zahlen von 1 bis 9 in die leeren Felder ein.',
    'Jede Zahl muss in jeder Zeile, jeder Spalte und jedem 3×3-Block genau einmal vorkommen.',
    'Tippe ein Feld an und wähle eine Zahl. Mit X leerst du das gewählte Feld. Die Glühbirne verrät die Zahl für dieses Feld. Der Rückgängig-Pfeil nimmt die letzte Änderung zurück.',
  ],
  musterfeld: () => [
    document.querySelector('#pattern-rule').textContent,
    'Trage die fehlende Zahl beim Fragezeichen ein und tippe auf „Lösen“. Die Glühbirne gibt einen Tipp.',
  ],
  haus: () => [
    'Das Haus ist am Anfang leer. Zähle mit, wie viele Personen hineingehen und herauskommen.',
    'Gib am Ende der Runde an, wie viele Personen noch im Haus sind.',
    'Bei einer richtigen Antwort kommt in der nächsten Runde eine Gruppe hinzu. Bei einer falschen Antwort wird es eine Gruppe weniger, bis auf mindestens drei.',
  ],
  merken: () => [
    'Tippe auf die Spielfläche und merke dir die Positionen der Zahlen.',
    'Tippe anschließend die Felder in der Reihenfolge 1, 2, 3 und so weiter an.',
    'Ein Durchlauf hat fünf Runden. Die Anzahl der Zahlen steigt nach jeder zweiten Runde.',
  ],
  zeit: () => [
    'Lies die beiden Uhren ab und berechne die Zeit vom Start bis zum Ende.',
    'Unter jeder Uhr steht die Tageshälfte. Wenn das Ende nach Mitternacht liegt, steht dort „Folgetag“.',
    'Gib Stunden und Minuten getrennt ein. Für eine Aufgabe ohne volle Stunden gibst du dort 0 ein.',
  ],
  seifenblasen: () => [
    'Beginne bei 1 und tippe immer die nächsthöhere Zahl an.',
    'Eine richtige Blase platzt. An einer freien Stelle erscheint eine neue Blase mit einer Zahl, die um eins höher ist als die bisher größte.',
    'Auf Leicht bleiben alle Blasen stehen. Auf Mittel bewegen sich zwei, auf Schwer fünf.',
  ],
  pfeilfolge: () => [
    'Tippe auf die große Fläche, merke dir die Pfeile und gib sie danach in derselben Reihenfolge ein.',
    'Die erste Folge hat drei Pfeile. Nach jeder richtigen Runde kommt ein Pfeil zur selben Folge hinzu.',
    'Bei einem Fehler kannst du dieselbe Folge noch einmal sehen. Pro Durchlauf stehen dir zwei Wiederholungen zur Verfügung.',
  ],
  'wo-wohne-ich': () => [
    'Verfolge die Wegbeschreibung vom markierten Ziel rückwärts und tippe auf das gesuchte Wohnhaus.',
    document.querySelector('#where-instructions').textContent,
    'Auf der Karte ist Norden oben. Einige Merkmale spielen für den Weg keine Rolle.',
  ],
  einmaleins: () => [
    'Mit „Starten“ startet die Zeit. Gib das Ergebnis über den Nummernblock oder die Tastatur ein.',
    'Mit „Abgeben“ oder Enter prüfst du die Antwort und wechselst sofort zur nächsten Aufgabe. Der Kreispfeil leert die Eingabe.',
    'Nach dem Durchlauf siehst du, wie viele Antworten richtig waren und wie viele du pro Sekunde abgegeben hast.',
  ],
};

function showRules() {
  if (!ruleRoute || rules.open) return;
  rulesGame.textContent = headerTitle.textContent;
  list.replaceChildren(...ruleContent[ruleRoute]().map((description) => {
    const item = document.createElement('li');
    item.textContent = description;
    return item;
  }));
  rules.showModal();
}

openRules.addEventListener('click', showRules);
for (const result of document.querySelectorAll('[data-game-result]')) {
  const button = openRules.cloneNode(true);
  button.removeAttribute('id');
  button.hidden = false;
  button.classList.add('result-rules');
  button.addEventListener('click', showRules);
  result.prepend(button);
}

function fitGame() {
  window.cancelAnimationFrame(frame);
  if (!playView) return;
  frame = window.requestAnimationFrame(() => {
    const style = window.getComputedStyle(main);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = Math.max(1, main.clientHeight - padding);
    const natural = playView.offsetHeight;
    if (!natural) return;
    playView.style.setProperty('--play-scale', String(Math.min(1, available / natural)));
  });
}

function resizeViewport() {
  if (window.visualViewport) {
    document.documentElement.style.setProperty('--app-height', window.visualViewport.height + 'px');
  }
  fitGame();
}

const observer = new ResizeObserver(fitGame);
observer.observe(main);
window.addEventListener('resize', resizeViewport);
window.visualViewport?.addEventListener('resize', resizeViewport);

export function updateLayout(route, view, game) {
  if (rules.open) rules.close();
  if (playView) {
    observer.unobserve(playView);
    playView.classList.remove('play-view');
    playView.style.removeProperty('--play-scale');
  }

  playView = game && view ? view : undefined;
  ruleRoute = playView && Object.hasOwn(ruleContent, route) ? route : undefined;
  const title = route ? view?.querySelector('h2')?.textContent : 'Inveni';
  headerTitle.textContent = title || game?.title || 'Inveni';
  back.hidden = !playView;
  overviewNav.hidden = Boolean(playView);
  for (const link of overviewLinks) {
    if (link.hash === '#' + route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  back.href = '#' + (game?.category ?? view?.dataset.parent ?? 'start');
  openRules.hidden = !ruleRoute;
  document.body.classList.toggle('is-playing', Boolean(playView));

  if (playView) {
    playView.classList.add('play-view');
    observer.observe(playView);
  }
  resizeViewport();
}

export function focusPageTitle() {
  headerTitle.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
