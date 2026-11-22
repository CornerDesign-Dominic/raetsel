import { games, markSolved } from './puzzle-levels.js';

// Each object and its matching shadow are painted from the same path.
const objects = [
  {
    name: 'Teekanne',
    colors: ['#dc936f', '#8c463d'],
    features: ['Tüllenlänge', 'Knaufhöhe', 'Henkelbreite'],
    outline: ([spout, lid, handle]) => `
      M54 47 Q59 40 71 39 L72 ${28 - lid}
      Q80 ${22 - lid} 88 ${28 - lid} L89 39 Q105 40 111 48
      L115 54 C${147 + handle} 40 ${150 + handle} 89 114 88
      Q105 102 83 102 H74 Q50 102 43 86 L${24 - spout} 60
      L${16 - spout} 58 L${18 - spout} 49 Q37 48 48 66 Z
      M119 61 C${136 + handle} 53 ${139 + handle} 77 120 79 Q122 70 119 61 Z`,
    details: 'M47 65 Q78 83 119 66 M52 78 Q72 89 103 82 M61 49 Q78 45 97 49',
  },
  {
    name: 'Schlüssel',
    colors: ['#77a69c', '#2c655e'],
    features: ['Schaftlänge', 'Länge des ersten Zahns', 'Länge des zweiten Zahns'],
    outline: ([shaft, first, second]) => `
      M67 51 H${137 + shaft} L${145 + shaft} 60 L${137 + shaft} 68
      H121 V${89 + second} H108 V68 H96 V${84 + first} H83 V68 H67
      C57 98 10 93 10 57 C10 22 59 19 67 51 Z
      M39 44 A13 13 0 1 0 39 70 A13 13 0 1 0 39 44 Z`,
    details: 'M66 60 H144 M20 48 Q24 37 39 36',
  },
  {
    name: 'Segelboot',
    colors: ['#8eace1', '#475f95'],
    features: ['Größe des linken Segels', 'Breite des rechten Segels', 'Länge des Bugs'],
    outline: ([left, right, bow]) => `
      M16 85 H74 V80 H${34 - left} L74 ${24 - left} V15 H79 L${126 + right} 76
      H79 V85 H${138 + bow} L${124 + bow} 102 H35 Z`,
    details: 'M12 91 H148 M85 30 L84 66 H104 M45 73 L68 42',
  },
  {
    name: 'Tischlampe',
    colors: ['#b9a0ce', '#6b5285'],
    features: ['Breite oben am Schirm', 'Breite unten am Schirm', 'Breite des Fußes'],
    outline: ([top, bottom, base]) => `
      M${62 - top} 24 H${98 + top} L${118 + bottom} 62
      Q${121 + bottom} 67 ${116 + bottom} 67 H105 V80 H101 V67 H84 V94
      H${101 + base} Q${108 + base} 94 ${109 + base} 103 H${51 - base}
      Q${52 - base} 94 ${59 - base} 94 H76 V67 H${44 - bottom}
      Q${39 - bottom} 67 ${42 - bottom} 62 Z`,
    details: 'M41 59 H119 M58 51 L68 31 M73 51 L76 31 M88 51 L86 31',
  },
];

const levelVariants = {
  mittel: [[10, 10, 0], [-10, 0, 10], [0, -10, -10]],
  schwer: [[6, 0, 0], [0, -6, 0], [0, 0, 6]],
};
const baseShape = [0, 0, 0];

const target = document.querySelector('#shadow-object');
const grid = document.querySelector('#shadow-choices');
const progress = document.querySelector('#shadow-progress');
const feedback = document.querySelector('#shadow-feedback');
const next = document.querySelector('#shadow-next');
let activeLevel;
let round;
let complete;

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function paint(canvas, object, changes, isShadow) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 160, 120);
  const outline = new Path2D(object.outline(changes));
  if (isShadow) {
    ctx.fillStyle = '#173a3b';
    ctx.fill(outline, 'evenodd');
    return;
  }

  ctx.save();
  ctx.clip(outline, 'evenodd');
  const finish = ctx.createLinearGradient(32, 12, 124, 110);
  finish.addColorStop(0, object.colors[0]);
  finish.addColorStop(1, object.colors[1]);
  ctx.fillStyle = finish;
  ctx.fillRect(0, 0, 160, 120);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fff5e5a0';
  ctx.stroke(new Path2D(object.details));
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#172c2d72';
  ctx.stroke(outline);
  ctx.restore();
}

function makeChoices(object) {
  const matching = { object, changes: baseShape, matches: true };
  const distractors = activeLevel === 'leicht'
    ? objects.filter((other) => other !== object).map((other) => ({ object: other, changes: baseShape }))
    : levelVariants[activeLevel].map((changes) => ({ object, changes }));
  return shuffled([matching, ...distractors]);
}

function describe(object, changes) {
  if (activeLevel === 'leicht') return object.name;
  const features = object.features.map((feature, index) => {
    const value = Math.sign(changes[index]) + 1;
    return `${feature}: ${['klein', 'mittel', 'groß'][value]}`;
  });
  return object.name + ', ' + features.join(', ');
}

function select(button, matches) {
  if (complete || button.getAttribute('aria-disabled') === 'true') return;
  button.dataset.answer = matches ? 'correct' : 'wrong';
  button.querySelector('.shadow-mark').textContent = matches ? '✓' : '×';
  button.setAttribute('aria-disabled', 'true');
  button.tabIndex = -1;
  if (!matches) {
    feedback.textContent = 'Passt noch nicht. Versuch es nochmal.';
    return;
  }

  complete = true;
  const finishedLevel = round === objects.length - 1;
  for (const choice of grid.children) {
    choice.setAttribute('aria-disabled', 'true');
    choice.tabIndex = -1;
  }
  feedback.textContent = finishedLevel ? 'Alle Schatten gefunden!' : 'Das passt!';
  if (finishedLevel) markSolved('schatten', activeLevel);
  next.textContent = finishedLevel ? 'Nochmal' : 'Weiter';
  next.disabled = false;
  next.hidden = false;
}

function showRound() {
  complete = false;
  const object = objects[round];
  progress.textContent = `Aufgabe ${round + 1} von ${objects.length}`;
  feedback.textContent = '';
  next.hidden = true;
  next.disabled = true;
  target.setAttribute('aria-label', 'Objekt: ' + describe(object, baseShape));
  paint(target, object, baseShape, false);

  grid.replaceChildren(...makeChoices(object).map((choice, index) => {
    const label = String.fromCharCode(65 + index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shadow-choice';
    button.setAttribute('aria-label', `Schatten ${label}: ${describe(choice.object, choice.changes)}`);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvas.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('span');
    caption.className = 'shadow-letter';
    caption.textContent = label;
    const mark = document.createElement('span');
    mark.className = 'shadow-mark';
    mark.setAttribute('aria-hidden', 'true');
    button.append(canvas, caption, mark);
    paint(canvas, choice.object, choice.changes, true);
    button.addEventListener('click', () => select(button, choice.matches));
    return button;
  }));
}

next.addEventListener('click', () => {
  round = (round + 1) % objects.length;
  showRound();
  progress.focus({ preventScroll: true });
});

games.set('schatten', {
  title: 'Schatten',
  category: 'raetsel',
  load(level) {
    activeLevel = level;
    round = 0;
    showRound();
  },
});
