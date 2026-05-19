const Fretboard = (() => {
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FRET_COUNT = 24;
  const TAPER = 0.96;

  const TUNINGS = {
    // 6-string standard
    'standard':    ['E','A','D','G','B','E'],
    'eb-standard': ['D#','G#','C#','F#','A#','D#'],
    'd-standard':  ['D','G','C','F','A','D'],
    'cs-standard': ['C#','F#','B','E','G#','C#'],
    'c-standard':  ['C','F','A#','D#','G','C'],
    'b-standard':  ['B','E','A','D','F#','B'],
    // 6-string drop
    'drop-d':      ['D','A','D','G','B','E'],
    'drop-cs':     ['C#','G#','C#','F#','A#','D#'],
    'drop-c':      ['C','G','C','F','A','D'],
    'drop-b':      ['B','F#','B','E','G#','C#'],
    'drop-as':     ['A#','F','A#','D#','G','C'],
    'drop-a':      ['A','E','A','D','F#','B'],
    // open / alternate
    'open-g':      ['D','G','D','G','B','D'],
    'open-d':      ['D','A','D','F#','A','D'],
    'dadgad':      ['D','A','D','G','A','D'],
    // 7-string
    '7-standard':  ['B','E','A','D','G','B','E'],
    '7-drop-a':    ['A','E','A','D','G','B','E'],
    '7-bb':        ['A#','D#','G#','C#','F#','A#','D#'],
    '7-drop-gs':   ['G#','D#','G#','C#','F#','A#','D#'],
    '7-a-std':     ['A','D','G','C','F','A','D'],
    '7-drop-g':    ['G','D','G','C','F','A','D'],
    '7-gs-std':    ['G#','C#','F#','B','E','G#','C#'],
    '7-drop-fs':   ['F#','C#','F#','B','E','G#','C#'],
    '7-fs-std':    ['F#','B','E','A','D','F#','B'],
    '7-drop-e':    ['E','B','E','A','D','F#','B'],
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

  // Module state
  let activeChord = null; // { root, notes: Set, label }
  let lastOpts    = {};

  function noteIndex(note) { return NOTES.indexOf(note); }

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

  function calcWidths() {
    const wrap = document.getElementById('fretboard-wrap');
    const total = Math.max(480, wrap.clientWidth - 37);
    const nutW = 28;
    const forFrets = total - nutW;
    let seriesSum = 0;
    for (let f = 1; f <= FRET_COUNT; f++) seriesSum += Math.pow(TAPER, f - 1);
    const base = forFrets / seriesSum;
    const widths = [nutW];
    for (let f = 1; f <= FRET_COUNT; f++) widths.push(Math.max(1, Math.round(base * Math.pow(TAPER, f - 1))));
    return widths;
  }

  function rerender() { render(lastOpts); }

  function render(opts) {
    lastOpts = opts;
    const { tuningKey = 'drop-b', customTuning = null, root = 'B', scaleKey = 'minor' } = opts;

    const strings  = customTuning || TUNINGS[tuningKey] || TUNINGS['standard'];
    const scaleSet = buildScaleSet(root, scaleKey);
    const widths   = calcWidths();

    const container = document.getElementById('fretboard');
    container.innerHTML = '';

    // Fret number row
    const numRow = document.createElement('div');
    numRow.className = 'fret-number-row';
    numRow.appendChild(Object.assign(document.createElement('div'), { className: 'fret-number-label' }));
    for (let f = 0; f <= FRET_COUNT; f++) {
      const n = document.createElement('div');
      n.className = 'fret-number' + (f === 0 ? ' fret-0' : '');
      n.style.width = widths[f] + 'px';
      n.textContent = f === 0 ? '' : f;
      numRow.appendChild(n);
    }
    container.appendChild(numRow);

    // String rows
    [...strings].reverse().forEach((openNote, rowIdx) => {
      const actualStringIdx = strings.length - 1 - rowIdx;
      const row = document.createElement('div');
      row.className = 'fret-row';

      const label = document.createElement('div');
      label.className = 'string-label';
      label.textContent = openNote;
      row.appendChild(label);

      for (let f = 0; f <= FRET_COUNT; f++) {
        const note = noteAtFret(openNote, f);
        const w    = widths[f];
        const cell = document.createElement('div');
        cell.className = 'fret-cell' + (f === 0 ? ' fret-0' : '');
        cell.style.width = w + 'px';

        // Dot coloring: chord mode overrides scale mode
        let dotClass = 'none';
        if (activeChord) {
          if (note === activeChord.root)        dotClass = 'root';
          else if (activeChord.notes.has(note)) dotClass = 'scale';
        } else if (scaleSet === null) {
          if (f === 0) dotClass = note === root ? 'root' : 'muted';
        } else {
          if (note === root)            dotClass = 'root';
          else if (scaleSet.has(note))  dotClass = 'scale';
        }

        if (dotClass !== 'none') {
          const dotSz    = Math.min(26, Math.max(14, w - 8));
          const dot      = document.createElement('div');
          dot.className  = `fret-dot ${dotClass}`;
          dot.style.width  = dotSz + 'px';
          dot.style.height = dotSz + 'px';
          if (dotSz < 20) dot.style.fontSize = '0';
          dot.textContent = note;
          cell.appendChild(dot);
        }

        // Position markers between strings 3 and 4
        if (rowIdx === 2 && MARKERS.has(f) && f !== 0) {
          const isDouble = f === 12 || f === 24;
          const group = document.createElement('div');
          group.className = 'fret-neck-dot-group' + (isDouble ? ' double' : '');
          group.innerHTML = isDouble
            ? '<span class="fret-neck-dot"></span><span class="fret-neck-dot"></span>'
            : '<span class="fret-neck-dot"></span>';
          cell.appendChild(group);
        }

        cell.title = `String ${actualStringIdx + 1} — Fret ${f}: ${note}`;
        row.appendChild(cell);
      }

      container.appendChild(row);
    });

    updateChordIndicator();
    renderChordStrip(root, scaleKey);
  }

  function updateChordIndicator() {
    const el = document.getElementById('chord-indicator');
    if (!el) return;
    if (!activeChord) {
      el.innerHTML = '';
      el.classList.add('hidden');
      return;
    }
    const noteList = [...activeChord.notes].join(', ');
    el.innerHTML = `<span>Showing <strong>${activeChord.label}</strong> — ${noteList}</span>
      <button class="chord-indicator-clear" title="Back to scale">×</button>`;
    el.classList.remove('hidden');
    el.querySelector('.chord-indicator-clear').addEventListener('click', () => {
      activeChord = null;
      rerender();
    });
  }

  // ── Chord grid ───────────────────────────────────────────────────────────────

  const STRIP_SCALES = new Set(['major','minor','dorian','phrygian','mixolydian','lydian','harmonic-minor']);

  const CHORD_TYPES = [
    { label: 'maj',      intervals: [0,4,7] },
    { label: 'min',      intervals: [0,3,7] },
    { label: '5',        intervals: [0,7] },
    { label: 'sus2',     intervals: [0,2,7] },
    { label: 'sus4',     intervals: [0,5,7] },
    { label: '7',        intervals: [0,4,7,10] },
    { label: 'maj7',     intervals: [0,4,7,11] },
    { label: 'm7',       intervals: [0,3,7,10] },
    { label: '7♭5',     intervals: [0,4,6,10] },
    { label: 'm7♭5',    intervals: [0,3,6,10] },
    { label: 'minmaj7',  intervals: [0,3,7,11] },
    { label: '7sus4',    intervals: [0,5,7,10] },
    { label: '6',        intervals: [0,4,7,9] },
    { label: 'min6',     intervals: [0,3,7,9] },
    { label: 'add9',     intervals: [0,2,4,7] },
    { label: 'm add9',   intervals: [0,2,3,7] },
    { label: '9',        intervals: [0,2,4,7,10] },
    { label: 'maj9',     intervals: [0,2,4,7,11] },
    { label: 'm9',       intervals: [0,2,3,7,10] },
    { label: '11',       intervals: [0,2,4,5,7,10] },
    { label: 'maj11',    intervals: [0,2,4,5,7,11] },
  ];

  function chordInScale(chordRoot, chordIntervals, scaleSet) {
    const ri = noteIndex(chordRoot);
    return chordIntervals.every(i => scaleSet.has(NOTES[(ri + i) % 12]));
  }

  function renderChordStrip(root, scaleKey) {
    const strip = document.getElementById('neck-chord-strip');
    if (!strip) return;
    strip.innerHTML = '';
    if (!STRIP_SCALES.has(scaleKey)) return;

    const rootIdx    = noteIndex(root);
    const scaleNotes = SCALES[scaleKey].map(i => NOTES[(rootIdx + i) % 12]);
    const scaleSet   = buildScaleSet(root, scaleKey);

    const heading = document.createElement('h4');
    heading.className = 'chord-grid-heading';
    heading.textContent = 'Chords in Scale';
    strip.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'chord-grid';
    grid.style.gridTemplateColumns = `52px repeat(${scaleNotes.length}, minmax(72px, 1fr))`;

    grid.appendChild(Object.assign(document.createElement('div'), { className: 'cg-cell cg-label' }));
    scaleNotes.forEach(note => {
      const h = document.createElement('div');
      h.className = 'cg-cell cg-note-header';
      h.textContent = note;
      grid.appendChild(h);
    });

    CHORD_TYPES.forEach(type => {
      const lbl = document.createElement('div');
      lbl.className = 'cg-cell cg-label';
      lbl.textContent = type.label;
      grid.appendChild(lbl);

      scaleNotes.forEach(note => {
        const inScale = chordInScale(note, type.intervals, scaleSet);
        const label   = note + type.label;
        const isActive = activeChord && activeChord.label === label;

        const cell = document.createElement('div');
        cell.className = 'cg-cell cg-chord'
          + (inScale  ? ' in-scale' : '')
          + (isActive ? ' selected' : '');
        cell.textContent = label;

        cell.addEventListener('click', () => {
          if (activeChord && activeChord.label === label) {
            activeChord = null;
          } else {
            const ri = noteIndex(note);
            const notes = new Set(type.intervals.map(i => NOTES[(ri + i) % 12]));
            activeChord = { root: note, notes, label };
          }
          rerender();
        });

        grid.appendChild(cell);
      });
    });

    strip.appendChild(grid);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    const presetSel   = document.getElementById('tuning-preset');
    const rootSel     = document.getElementById('root-note');
    const scaleSel    = document.getElementById('scale-select');
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
      });
    }

    presetSel.addEventListener('change', redraw);
    rootSel.addEventListener('change', redraw);
    scaleSel.addEventListener('change', redraw);
    stringInputs.forEach(i => i.addEventListener('input', redraw));

    let resizeTimer;
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redraw, 40);
    }).observe(document.getElementById('fretboard-wrap'));

    redraw();
  }

  return { init };
})();
