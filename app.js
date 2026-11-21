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
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Offline-Modus konnte nicht aktiviert werden.', error);
  });
}
