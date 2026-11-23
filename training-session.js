const closeButton = (label) => `
  <form method="dialog">
    <button type="submit" class="icon-button dialog-close" aria-label="${label}">
      <span aria-hidden="true">×</span>
    </button>
  </form>`;

export function mountTrainingSession(root, { toolbar, stage, reset, restart = reset }) {
  const id = root.id || root.closest('[data-view]').dataset.view;
  toolbar.classList.add('training-toolbar');
  toolbar.setAttribute('aria-label', 'Laufender Durchlauf');
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.disabled = true;
  resetButton.className = 'icon-button training-reset';
  resetButton.title = 'Durchlauf zurücksetzen';
  resetButton.setAttribute('aria-label', resetButton.title);
  resetButton.setAttribute('aria-haspopup', 'dialog');
  resetButton.setAttribute('aria-controls', id + '-reset');
  resetButton.innerHTML = '<svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>';
  toolbar.append(resetButton);

  root.insertAdjacentHTML('beforeend', `
    <dialog class="result-dialog training-reset-dialog" id="${id}-reset" aria-labelledby="${id}-reset-title" aria-describedby="${id}-reset-description">
      <h2 id="${id}-reset-title">Durchlauf abbrechen?</h2>
      <p id="${id}-reset-description">Dein Fortschritt in diesem Durchlauf geht verloren.</p>
      ${closeButton('Weiterspielen')}
      <button type="button" data-confirm-reset>Durchlauf abbrechen</button>
    </dialog>
    <dialog class="result-dialog training-result-dialog" aria-labelledby="${id}-result-title">
      <h2 id="${id}-result-title" tabindex="-1" autofocus></h2>
      ${closeButton('Ergebnis schließen')}
      <p data-result-message hidden></p>
      <dl class="training-result-stats"></dl>
      <div class="training-result-actions">
        <button type="button" data-result-restart>Nochmal</button>
        <button type="button" class="secondary-action" data-result-leave>Verlassen</button>
      </div>
    </dialog>`);

  const resetDialog = root.querySelector('.training-reset-dialog');
  const resultDialog = root.querySelector('.training-result-dialog');
  const heading = resultDialog.querySelector('h2');
  const message = resultDialog.querySelector('[data-result-message]');
  const stats = resultDialog.querySelector('dl');
  const review = addStageAction(stage, () => resultDialog.showModal(), 'Ergebnis anzeigen');
  review.classList.remove('training-ready');
  review.hidden = true;
  resetDialog.querySelector('.dialog-close').autofocus = true;
  resetButton.addEventListener('click', () => resetDialog.showModal());
  function returnToReady(dialog, action) {
    dialog.close();
    action();
    stage.querySelector('.training-ready:not([hidden])')?.focus({ preventScroll: true });
  }

  resetDialog.querySelector('[data-confirm-reset]').addEventListener('click', () => returnToReady(resetDialog, reset));
  resultDialog.querySelector('[data-result-restart]').addEventListener('click', () => returnToReady(resultDialog, restart));
  resultDialog.querySelector('[data-result-leave]').addEventListener('click', () => {
    resultDialog.close();
    window.location.hash = 'training';
  });
  resultDialog.addEventListener('close', () => {
    if (!review.hidden && !resultDialog.open && !root.closest('[hidden]')) review.focus({ preventScroll: true });
  });

  return {
    get modalOpen() { return resetDialog.open || resultDialog.open; },
    setRunning(running) {
      resetButton.disabled = !running;
      review.hidden = true;
    },
    finish({ metrics, title = 'Durchlauf beendet', detail = '', record = false, stacked = false }) {
      resetButton.disabled = true;
      review.hidden = false;
      heading.textContent = title;
      message.textContent = detail;
      message.hidden = !detail;
      resultDialog.classList.toggle('is-record', record);
      stats.classList.toggle('training-result-list', stacked);
      stats.replaceChildren(...metrics.map(([label, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const data = document.createElement('dd');
        term.textContent = label;
        data.textContent = value;
        row.append(term, data);
        return row;
      }));
      resultDialog.showModal();
    },
    leave() {
      review.hidden = true;
      if (resetDialog.open) resetDialog.close();
      if (resultDialog.open) resultDialog.close();
    },
  };
}

export function addStageAction(stage, action, label = 'Tippe, um zu beginnen') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'training-start training-ready';
  button.textContent = label;
  button.addEventListener('click', action);
  stage.append(button);
  return button;
}
