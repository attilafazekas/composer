const Chords = (() => {
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  const SCALE_INTERVALS = {
    major:       [0,2,4,5,7,9,11],
    minor:       [0,2,3,5,7,8,10],
    dorian:      [0,2,3,5,7,9,10],
    phrygian:    [0,1,3,5,7,8,10],
    mixolydian:  [0,2,4,5,7,9,10],
  };

  // Triad quality from scale degree intervals
  function triadQuality(intervals, degree) {
    const root = intervals[degree];
    const third = intervals[(degree + 2) % intervals.length];
    const fifth = intervals[(degree + 4) % intervals.length];
    const t3 = ((third - root + 12) % 12);
    const t5 = ((fifth - root + 12) % 12);
    if (t3 === 4 && t5 === 7) return 'maj';
    if (t3 === 3 && t5 === 7) return 'min';
    if (t3 === 3 && t5 === 6) return 'dim';
    if (t3 === 4 && t5 === 8) return 'aug';
    return '';
  }

  const ROMAN = ['I','II','III','IV','V','VI','VII'];

  function buildDiatonic(root, scaleKey) {
    const intervals = SCALE_INTERVALS[scaleKey] || SCALE_INTERVALS.minor;
    const rootIdx = NOTES.indexOf(root);
    return intervals.map((interval, i) => {
      const noteIdx = (rootIdx + interval) % 12;
      const note = NOTES[noteIdx];
      const quality = triadQuality(intervals, i);
      const numeral = quality === 'min' || quality === 'dim'
        ? ROMAN[i].toLowerCase()
        : ROMAN[i];
      const displayQuality = quality === 'maj' ? '' : quality === 'min' ? 'm' : quality;
      return { note, quality, numeral, display: note + displayQuality };
    });
  }

  const COMMON_PATTERNS = [
    { label: 'Pop / Rock',    degrees: [0,4,5,3] },
    { label: 'Classic Rock',  degrees: [0,3,4]   },
    { label: '50s Doo-wop',   degrees: [0,5,3,4] },
    { label: 'Minor Sad',     degrees: [5,3,6,4] },
    { label: 'Andalusian',    degrees: [6,5,3,4] },
    { label: 'Jazz ii–V–I',   degrees: [1,4,0]   },
    { label: 'Blues I–IV–V',  degrees: [0,3,4]   },
  ];

  let progression = [];
  let diatonicChords = [];

  function render() {
    const root = document.getElementById('chord-root').value;
    const scale = document.getElementById('chord-scale').value;
    diatonicChords = buildDiatonic(root, scale);

    // Diatonic grid
    const grid = document.getElementById('diatonic-grid');
    grid.innerHTML = '';
    diatonicChords.forEach((chord, i) => {
      const tile = document.createElement('div');
      tile.className = 'chord-tile';
      tile.innerHTML = `
        <div class="numeral">${chord.numeral}</div>
        <div class="chord-name">${chord.display}</div>
        <div class="chord-quality">${chord.quality}</div>`;
      tile.addEventListener('click', () => addToProgression(chord.display));
      grid.appendChild(tile);
    });

    // Common progressions
    const list = document.getElementById('common-list');
    list.innerHTML = '';
    COMMON_PATTERNS.forEach(p => {
      const chordNames = p.degrees.map(d => {
        const c = diatonicChords[d % diatonicChords.length];
        return c ? c.display : '?';
      });
      const item = document.createElement('div');
      item.className = 'common-item';
      item.innerHTML = `<span class="label">${p.label}</span>
                        <span class="chords">${chordNames.join(' — ')}</span>`;
      item.addEventListener('click', () => {
        progression = chordNames.slice();
        renderProgression();
      });
      list.appendChild(item);
    });

    renderProgression();
  }

  function addToProgression(chordName) {
    progression.push(chordName);
    renderProgression();
  }

  function renderProgression() {
    const row = document.getElementById('progression-row');
    row.innerHTML = '';
    if (!progression.length) {
      row.innerHTML = '<span class="progression-empty">Click chords above to build a progression</span>';
      return;
    }
    progression.forEach((name, i) => {
      const chip = document.createElement('div');
      chip.className = 'prog-chord';
      chip.innerHTML = `${name} <span class="remove" data-idx="${i}">×</span>`;
      chip.querySelector('.remove').addEventListener('click', (e) => {
        e.stopPropagation();
        progression.splice(i, 1);
        renderProgression();
      });
      row.appendChild(chip);
    });
  }

  function init() {
    document.getElementById('chord-root').addEventListener('change', render);
    document.getElementById('chord-scale').addEventListener('change', render);

    document.getElementById('clear-progression').addEventListener('click', () => {
      progression = [];
      renderProgression();
    });

    document.getElementById('copy-progression').addEventListener('click', () => {
      const text = progression.join(' - ');
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-progression');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1500);
      });
    });

    render();
  }

  function getProgressionText() {
    return progression.join(' - ');
  }

  return { init, getProgressionText };
})();
