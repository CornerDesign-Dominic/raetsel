const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((digit) =>
  `<button type="button" data-digit="${digit}">${digit}</button>`).join('');

export function mountNumberPad(pad, input) {
  pad.innerHTML = keys + `
    <button class="icon-button" type="button" aria-label="Eingabe leeren" title="Eingabe leeren">
      <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
    </button>
  `;
  pad.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || input.disabled || input.readOnly) return;

    const { digit } = button.dataset;
    if (digit === undefined) input.value = '';
    else if (input.value.length < input.maxLength) input.value += digit;

    input.dispatchEvent(new Event('input'));
    input.focus({ preventScroll: true });
  });
}
