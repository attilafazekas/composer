const Fretboard = (() => {
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  const TUNINGS = {
    'standard':  ['E','A','D','G','B','E'],
    'drop-d':    ['D','A','D','G','B','E'],
    'drop-c':    ['C','G','C','F','A','D'],
    'drop-b':    ['B','F#','B','E','G#','C#'],
    'open-g':    ['D','G','D','G','B','D'],
    'open-d':    ['D','A','D','F#','A','D'],
    'dadgad':    ['D','A','D','G','A','D'],
  };

  const SCALES = {
    'none':          [],
    'major':         [0,2,4,5,7,9,11],
    'minor':         [0,2,3,5,7,8,10],
    'pent-major':    [0,2,4,7,9],
    'pent-minor':    [0,3,5,7,10],
    'blues':         [0,3,5,6,7,10],
    'dorian':        [0,2,3,5,7,9,10],
    'phrygian':      [0,1,3,5,7,8,10],
    'lydian':        [0,2,4,6,7,9,11],
    'mixolydian':    [0,2,4,5,7,9,10],
    'harmonic-minor':[0,2,3,5,7,8,11],
  };

  const MARKERS = new Set([3,5,7,9,12,15,17,19,21,24]);

  function noteIndex(note) {
    return NOTES.indexOf(note);
  }

  function noteAtFret(openNote, fret) {
    const idx = noteIndex(openNote);
    if (idx === -1) return '?';
    return NOTES[(idx + fret) % 12];
  }

  function buildScaleSet(root, scaleKey) {
    const intervals = SCALES[scaleKey] || [];
    const rootIdx = noteIndex(root);
    if (rootIdx === -1 || intervals.length === 0) return null;
    return new Set(intervals.map(i => NOTES[(rootIdx + i) % 12]));
  }

  function render(opts) {
    const {
      tuningKey = 'drop-b',
      customTuning = null,
      root = 'B',
      scaleKey = 'minor',
      fretCount = 22,
    } = opts;

    const strings = customTuning || TUNINGS[tuningKey] || TUNINGS['standard'];
    const scaleSet = buildScaleSet(root, scaleKey);
    const container = document.getElementById('fretboard');
    container.innerHTML = '';

    // Fret numbers row (top)
    const numRow = document.createElement('div');
    numRow.className = 'fret-number-row';
    const numLabel = document.createElement('div');
    numLabel.className = 'fret-number-label';
    numRow.appendChild(numLabel);
    for (let f = 0; f <= fretCount; f++) {
      const n = document.createElement('div');
      n.className = 'fret-number' + (f === 0 ? ' fret-0' : '');
      n.textContent = f === 0 ? '' : f;
      if (MARKERS.has(f) && f !== 0) n.style.color = '#aaa';
      numRow.appendChild(n);
    }
    container.appendChild(numRow);

    // String rows (low string first = strings[0])
    [...strings].reverse().forEach((openNote, rowIdx) => {
      const actualStringIdx = strings.length - 1 - rowIdx;
      const row = document.createElement('div');
      row.className = 'fret-row';

      const label = document.createElement('div');
      label.className = 'string-label';
      label.textContent = openNote;
      row.appendChild(label);

      for (let f = 0; f <= fretCount; f++) {
        const note = noteAtFret(openNote, f);
        const cell = document.createElement('div');
        cell.className = 'fret-cell' + (f === 0 ? ' fret-0' : '');

        let dotClass = 'none';
        if (scaleSet === null) {
          // No scale — show open string note only at fret 0
          if (f === 0) dotClass = note === root ? 'root' : 'muted';
        } else {
          if (note === root) dotClass = 'root';
          else if (scaleSet.has(note)) dotClass = 'scale';
        }

        if (dotClass !== 'none') {
          const dot = document.createElement('div');
          dot.className = `fret-dot ${dotClass}`;
          dot.textContent = note;
          cell.appendChild(dot);
        }

        // Fret position marker dot on string 2 (middle-ish)
        if (MARKERS.has(f) && actualStringIdx === 2 && f !== 0) {
          const marker = document.createElement('div');
          marker.className = 'fret-marker';
          marker.textContent = f === 12 ? '◆' : '·';
          cell.appendChild(marker);
        }

        cell.title = `String ${actualStringIdx + 1} — Fret ${f}: ${note}`;
        row.appendChild(cell);
      }

      container.appendChild(row);
    });
  }

  function init() {
    const presetSel = document.getElementById('tuning-preset');
    const rootSel   = document.getElementById('root-note');
    const scaleSel  = document.getElementById('scale-select');
    const fretSel   = document.getElementById('fret-count');
    const customGroup = document.getElementById('custom-tuning-group');
    const stringInputs = Array.from(document.querySelectorAll('.string-note'));

    function getCustomTuning() {
      const vals = stringInputs.map(i => i.value.trim());
      return vals.every(v => v) ? vals : null;
    }

    function redraw() {
      const isCustom = presetSel.value === 'custom';
      customGroup.style.display = isCustom ? 'block' : 'none';
      render({
        tuningKey:    presetSel.value,
        customTuning: isCustom ? getCustomTuning() : null,
        root:         rootSel.value,
        scaleKey:     scaleSel.value,
        fretCount:    parseInt(fretSel.value),
      });
    }

    presetSel.addEventListener('change', redraw);
    rootSel.addEventListener('change', redraw);
    scaleSel.addEventListener('change', redraw);
    fretSel.addEventListener('change', redraw);
    stringInputs.forEach(i => i.addEventListener('input', redraw));

    redraw();
  }

  return { init };
})();
