const game = document.querySelector('#pattern-game');
const answerInput = document.querySelector('#pattern-answer');
const hintButton = document.querySelector('#hint-pattern');
const hint = document.querySelector('#pattern-hint');
const dialog = document.querySelector('#pattern-result');
const title = document.querySelector('#pattern-result-title');
const message = document.querySelector('#pattern-result-message');
const closeButton = document.querySelector('#pattern-result-close');

game.addEventListener('submit', (event) => {
  event.preventDefault();
  const answer = answerInput.value.trim();
  const isInteger = /^\d+$/.test(answer);
  const solved = isInteger && Number(answer) === 14;

  title.textContent = solved ? 'Hurra, geschafft!' : isInteger ? 'Oh nein!' : 'Eine Zahl fehlt';
  closeButton.textContent = solved ? 'Schließen' : 'Weiter rätseln';

  if (solved) {
    message.textContent = 'Verdopple die erste Zahl und addiere die zweite. In der letzten Zeile ergibt das 2 × 4 + 6 = 14.';
  } else if (isInteger) {
    message.textContent = 'Diese Zahl passt noch nicht. Prüfe, ob deine Regel in allen drei ausgefüllten Zeilen funktioniert.';
  } else {
    message.textContent = 'Trage eine ganze Zahl in das Feld mit dem Fragezeichen ein.';
  }
  dialog.showModal();
});

hintButton.addEventListener('click', () => {
  const visible = hintButton.getAttribute('aria-expanded') === 'true';
  hintButton.setAttribute('aria-expanded', String(!visible));
  hint.textContent = visible ? '' : 'Zieh in jeder fertigen Zeile die mittlere von der rechten Zahl ab. Was fällt dir am Ergebnis auf?';
});

window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
});
