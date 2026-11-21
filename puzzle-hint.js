const dialog = document.querySelector('#puzzle-hint');
const text = document.querySelector('#puzzle-hint-text');

dialog.addEventListener('cancel', (event) => event.preventDefault());

export function showHint(message) {
  if (dialog.open) return;
  text.textContent = message;
  dialog.showModal();
}
