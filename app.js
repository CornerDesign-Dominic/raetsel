import { games, levels, chooseDifficulty, closeDifficulty } from './puzzle-levels.js';
import './logic-grid.js';
import './number-pattern.js';
import './haus.js';
import './merken.js';
import './zeit.js';
import './einmaleins.js';
import './seifenblasen.js';
import './sudoku.js';
import './schatten.js';
import './pfeilfolge.js';
import './wo-wohne-ich.js';
import { updateLayout, focusPageTitle } from './app-layout.js';

const installSection = document.querySelector('#install');
const installButton = document.querySelector('#install-button');
const installHelp = document.querySelector('#install-help');
const standalone = window.matchMedia('(display-mode: standalone)');
let installPrompt;

function updateInstallControls() {
  installSection.hidden = standalone.matches || navigator.standalone === true;
  installButton.hidden = !installPrompt;
  installHelp.hidden = Boolean(installPrompt);
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  updateInstallControls();
});

installButton.addEventListener('click', async () => {
  const prompt = installPrompt;
  if (!prompt) return;

  installPrompt = undefined;
  try {
    await prompt.prompt();
  } catch (error) {
    console.warn('Der Installationsdialog konnte nicht geöffnet werden.', error);
  } finally {
    updateInstallControls();
  }
});

window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  installSection.hidden = true;
});

standalone.addEventListener('change', updateInstallControls);
updateInstallControls();

if ('serviceWorker' in navigator) {
  const serviceWorker = navigator.serviceWorker;
  const updateButton = document.querySelector('#update-app');
  const updateStatus = document.querySelector('#update-status');
  let controller = serviceWorker.controller;
  let activationTimer;

  serviceWorker.addEventListener('controllerchange', () => {
    const previous = controller;
    controller = serviceWorker.controller;
    if (!controller || controller === previous) return;
    window.clearTimeout(activationTimer);
    if (previous || updateButton.disabled) window.location.reload();
  });

  serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((registration) => {
    updateButton.hidden = false;
    updateButton.addEventListener('click', async () => {
      updateButton.disabled = true;
      updateStatus.textContent = 'Suche nach Updates …';

      try {
        if (!registration.waiting && !registration.installing) await registration.update();
        const installing = registration.installing;
        if (installing) await waitForInstall(installing);
        if (registration.waiting) {
          updateStatus.textContent = 'Update wird geladen …';
          activationTimer = window.setTimeout(() => {
            updateStatus.textContent = 'Das Update konnte noch nicht aktiviert werden. Versuche es erneut.';
            updateButton.disabled = false;
          }, 15000);
          registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
          return;
        }
        updateStatus.textContent = 'Inveni ist auf dem neuesten Stand.';
      } catch {
        window.clearTimeout(activationTimer);
        updateStatus.textContent = 'Die Updatesuche ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut.';
      }
      updateButton.disabled = false;
    });
  }).catch((error) => {
    console.warn('Offline-Modus konnte nicht aktiviert werden.', error);
  });
}

function waitForInstall(worker) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('Installationszeit überschritten')), 15000);

    function finish(error) {
      window.clearTimeout(timeout);
      worker.removeEventListener('statechange', onStateChange);
      if (error) reject(error);
      else resolve();
    }

    function onStateChange() {
      if (worker.state === 'redundant') finish(new Error('Installation fehlgeschlagen'));
      else if (worker.state !== 'installing') finish();
    }

    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
}

const views = [...document.querySelectorAll('[data-view]')];
const legacyRoutes = new Map([
  ['busfahrt', 'haus'],
  ['logik', 'raetsel'],
  ['zahlen-und-muster', 'training'],
  ['zahlen', 'training'],
  ['kurzzeitgedaechtnis', 'training'],
  ['start', 'training'],
  ['gedaechtnis', 'training'],
]);
let activeGame;

function showView(moveFocus = false) {
  const [requestedRoute, level] = window.location.hash.slice(1).split('/');
  const route = legacyRoutes.get(requestedRoute) ?? (requestedRoute || 'training');
  const game = games.get(route);
  const gameLevel = game && Object.hasOwn(game.options ?? levels, level) ? level : null;
  const needsDifficulty = game && !gameLevel;
  const destination = needsDifficulty ? game.category : route;
  const currentView = views.find((view) => view.dataset.view === destination) ?? views[0];
  const activeRoute = currentView.dataset.view;

  activeGame?.leave?.();
  activeGame = needsDifficulty ? undefined : game;

  for (const view of views) {
    view.hidden = view.dataset.view !== activeRoute;
  }

  if (needsDifficulty) {
    updateLayout(activeRoute, currentView);
    chooseDifficulty(route, game);
    return;
  }

  closeDifficulty();
  if (activeGame) activeGame.load(gameLevel);

  updateLayout(activeRoute, currentView, activeGame);
  if (moveFocus) focusPageTitle();
}

window.addEventListener('hashchange', () => showView(true));
showView();
