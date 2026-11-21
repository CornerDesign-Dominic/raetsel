const game = document.querySelector('#word-game');
const hintButton = document.querySelector('#hint-word');
const hint = document.querySelector('#word-hint');
const dialog = document.querySelector('#word-result');
const title = document.querySelector('#word-result-title');
const message = document.querySelector('#word-result-message');
const closeButton = document.querySelector('#word-result-close');

game.addEventListener('submit', (event) => {
  event.preventDefault();
  const answer = new FormData(game).get('word-answer');
  const solved = answer === 'sonnenuhr';

  title.textContent = solved ? 'Hurra, geschafft!' : answer ? 'Oh nein!' : 'Wähle ein Bild';
  closeButton.textContent = solved ? 'Schließen' : 'Weiter rätseln';

  if (solved) {
    message.textContent = 'Bei einer Sonnenuhr zeigt der Schatten auf den Teilstrichen die örtliche Sonnenzeit an.';
  } else if (answer) {
    message.textContent = 'Welches Bild passt zu allen drei Hinweisen? Schau dir die Begriffe noch einmal zusammen an.';
  } else {
    message.textContent = 'Tippe auf das Bild, das deiner Meinung nach zu allen drei Begriffen passt.';
  }
  dialog.showModal();
});

hintButton.addEventListener('click', () => {
  const visible = hintButton.getAttribute('aria-expanded') === 'true';
  hintButton.setAttribute('aria-expanded', String(!visible));
  hint.textContent = visible ? '' : 'Nachts bleibt sie stehen.';
});

window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
});
