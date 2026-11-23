const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((digit) =>
  `<button type="button" data-digit="${digit}">${digit}</button>`).join('');

export function mountNumberPad(pad, target) {
  pad.innerHTML = keys + `
    <button class="icon-button" type="button" aria-label="Eingabe leeren" title="Eingabe leeren">
      <svg aria-hidden="true"><use href="#icon-undo-circle"></use></svg>
    </button>
  `;
  pad.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const input = typeof target === 'function' ? target() : target;
    if (!button || button.matches(':disabled') || !input || input.disabled || input.readOnly) return;

    const { digit } = button.dataset;
    if (digit === undefined) input.value = '';
    else {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (input.value.length - (end - start) >= input.maxLength) return;
      input.setRangeText(digit, start, end, 'end');
    }

    input.dispatchEvent(new Event('input'));
    input.focus({ preventScroll: true });
  });
}
