const ChordsTab = (() => {
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FRET_COUNT = 24;
  const TAPER = 0.96;

  const TUNINGS = {
    'standard':    ['E','A','D','G','B','E'],
    'eb-standard': ['D#','G#','C#','F#','A#','D#'],
    'd-standard':  ['D','G','C','F','A','D'],
    'cs-standard': ['C#','F#','B','E','G#','C#'],
    'c-standard':  ['C','F','A#','D#','G','C'],
    'b-standard':  ['B','E','A','D','F#','B'],
    'drop-d':      ['D','A','D','G','B','E'],
    'drop-cs':     ['C#','G#','C#','F#','A#','D#'],
    'drop-c':      ['C','G','C','F','A','D'],
    'drop-b':      ['B','F#','B','E','G#','C#'],
    'drop-as':     ['A#','F','A#','D#','G','C'],
    'drop-a':      ['A','E','A','D','F#','B'],
    'open-g':      ['D','G','D','G','B','D'],
    'open-d':      ['D','A','D','F#','A','D'],
    'dadgad':      ['D','A','D','G','A','D'],
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

  const CHORD_DEFS = [
    { label: 'maj',     intervals: [0,4,7] },
    { label: 'min',     intervals: [0,3,7] },
    { label: '5',       intervals: [0,7] },
    { label: 'sus2',    intervals: [0,2,7] },
    { label: 'sus4',    intervals: [0,5,7] },
    { label: '7',       intervals: [0,4,7,10] },
    { label: 'maj7',    intervals: [0,4,7,11] },
    { label: 'm7',      intervals: [0,3,7,10] },
    { label: 'dim',     intervals: [0,3,6] },
    { label: 'aug',     intervals: [0,4,8] },
    { label: 'm7b5',    intervals: [0,3,6,10] },
    { label: 'add9',    intervals: [0,2,4,7] },
    { label: '9',       intervals: [0,2,4,7,10] },
    { label: 'maj9',    intervals: [0,2,4,7,11] },
    { label: 'm9',      intervals: [0,2,3,7,10] },
  ];

  let currentRoot   = 'B';
  let currentDef    = CHORD_DEFS[0];
  let currentTuning = 'drop-b';
  let voicings      = [];
  let selectedIdx   = 0;

  function noteIndex(n) { return NOTES.indexOf(n); }

  function noteAtFret(openNote, fret) {
    const idx = noteIndex(openNote);
    if (idx === -1) return '?';
    return NOTES[(idx + fret) % 12];
  }

  // ── Voicing generator ──────────────────────────────────────────────────────

  function generateVoicings(strings, chordNotes, root) {
    const allResults = [];
    const seen       = new Set();

    // Scan the full neck in overlapping 5-fret windows
    for (let lo = 0; lo <= 19; lo++) {
      const hi = lo + 4;
      backtrack(strings, chordNotes, root, lo, hi, [], 0, allResults, seen);
    }

    // Group by 3-fret zone, keep best 3 per zone (most strings played), sort zones low→high
    const zones = {};
    allResults.forEach(v => {
      const fretted = v.frets.filter(f => f > 0);
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      const zone    = Math.floor(minFret / 3);
      if (!zones[zone]) zones[zone] = [];
      zones[zone].push(v);
    });

    const results = [];
    Object.keys(zones).sort((a, b) => +a - +b).forEach(z => {
      const group = zones[z].sort((a, b) => {
        const aPlayed = a.frets.filter(f => f >= 0).length;
        const bPlayed = b.frets.filter(f => f >= 0).length;
        return bPlayed - aPlayed;
      });
      results.push(...group.slice(0, 3));
    });

    return results.slice(0, 24);
  }

  function backtrack(strings, chordNotes, root, lo, hi, assignment, strIdx, results, seen) {
    if (strIdx === strings.length) {
      const played = assignment.filter(f => f >= 0);
      if (played.length < 3) return;

      // Check all chord tones are covered
      const playedNotes = new Set(
        assignment.map((f, i) => f >= 0 ? noteAtFret(strings[i], f) : null).filter(Boolean)
      );
      const allCovered = chordNotes.every(n => playedNotes.has(n));
      if (!allCovered) return;

      const key = JSON.stringify(assignment);
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ frets: assignment.slice() });
      return;
    }

    const openNote = strings[strIdx];
    const options  = [];

    // Fret 0 (open string) always an option
    const openN = noteAtFret(openNote, 0);
    if (chordNotes.includes(openN)) options.push(0);

    // Frets in window
    for (let f = Math.max(1, lo); f <= hi; f++) {
      const n = noteAtFret(openNote, f);
      if (chordNotes.includes(n)) options.push(f);
    }

    // Option: mute this string
    options.push(-1);

    for (const f of options) {
      assignment.push(f);

      // Prune: fretted span check
      const fretted = assignment.filter(x => x > 0);
      if (fretted.length > 1) {
        const span = Math.max(...fretted) - Math.min(...fretted);
        if (span > 4) { assignment.pop(); continue; }
      }

      backtrack(strings, chordNotes, root, lo, hi, assignment, strIdx + 1, results, seen);
      assignment.pop();
    }
  }

  // ── SVG diagram ────────────────────────────────────────────────────────────

  function buildSvgDiagram(voicing, strings, root, chordNotes) {
    const W = 80, H = 108;
    const padL = 12, padR = 12, padTop = 20, padBot = 8;
    const n = strings.length;
    const cols = n - 1 || 1;
    const colW = (W - padL - padR) / cols;
    const fretted = voicing.frets.filter(f => f > 0);
    const minFret = fretted.length ? Math.min(...fretted) : 1;
    const atNut   = minFret <= 1;
    const startFret = atNut ? 1 : minFret;
    const rows = 5;
    const rowH = (H - padTop - padBot) / rows;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

    // Fret lines
    for (let r = 0; r <= rows; r++) {
      const y = padTop + r * rowH;
      const strokeW = (r === 0 && atNut) ? 3 : 1;
      svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#444" stroke-width="${strokeW}"/>`;
    }

    // String lines
    for (let s = 0; s < n; s++) {
      const x = padL + s * colW;
      svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + rows * rowH}" stroke="#555" stroke-width="1"/>`;
    }

    // Position label (if not at nut)
    if (!atNut) {
      svg += `<text x="${W - padR + 2}" y="${padTop + rowH * 0.7}" font-size="9" fill="#888" dominant-baseline="middle">${startFret}</text>`;
    }

    // Barre detection: if ≥3 strings share the lowest non-zero fret
    if (fretted.length >= 3) {
      const barreIndices = voicing.frets.reduce((acc, f, i) => {
        if (f === minFret) acc.push(i); return acc;
      }, []);
      if (barreIndices.length >= 3 && !atNut) {
        const row  = minFret - startFret;
        const cy   = padTop + (row + 0.5) * rowH;
        const x1   = padL + barreIndices[0] * colW;
        const x2   = padL + barreIndices[barreIndices.length - 1] * colW;
        svg += `<rect x="${x1 - 5}" y="${cy - 6}" width="${x2 - x1 + 10}" height="12" rx="6" fill="#7c5cfc" opacity="0.6"/>`;
      }
    }

    // Per-string symbols
    voicing.frets.forEach((f, s) => {
      const x = padL + s * colW;
      if (f === -1) {
        // Muted
        svg += `<text x="${x}" y="${padTop - 6}" font-size="10" fill="#666" text-anchor="middle">×</text>`;
      } else if (f === 0) {
        // Open
        svg += `<circle cx="${x}" cy="${padTop - 8}" r="4" fill="none" stroke="#666" stroke-width="1.5"/>`;
      } else {
        const row  = f - startFret;
        const cy   = padTop + (row + 0.5) * rowH;
        const noteName = noteAtFret(strings[s], f);
        const isRoot   = noteName === root;
        const fill     = isRoot ? '#fc5c7c' : '#7c5cfc';
        svg += `<circle cx="${x}" cy="${cy}" r="7" fill="${fill}"/>`;
      }
    });

    svg += '</svg>';
    return svg;
  }

  // ── Neck renderer ──────────────────────────────────────────────────────────

  function calcWidths() {
    const wrap = document.getElementById('cf-neck-wrap');
    if (!wrap) return [];
    const total = Math.max(480, wrap.clientWidth - 37);
    const nutW  = 28;
    const forFrets = total - nutW;
    let seriesSum = 0;
    for (let f = 1; f <= FRET_COUNT; f++) seriesSum += Math.pow(TAPER, f - 1);
    const base = forFrets / seriesSum;
    const widths = [nutW];
    for (let f = 1; f <= FRET_COUNT; f++) widths.push(Math.max(1, Math.round(base * Math.pow(TAPER, f - 1))));
    return widths;
  }

  function renderVoicingNeck(voicing, strings, root) {
    const container = document.getElementById('cf-neck');
    if (!container) return;
    container.innerHTML = '';
    const widths = calcWidths();
    if (!widths.length) return;

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

    const MARKERS = new Set([3,5,7,9,12,15,17,19,21,24]);

    // String rows (high to low visually = reversed)
    [...strings].reverse().forEach((openNote, rowIdx) => {
      const strIdx = strings.length - 1 - rowIdx;
      const voicedFret = voicing ? voicing.frets[strIdx] : undefined;
      const muted = voicedFret === -1;

      const row = document.createElement('div');
      row.className = 'fret-row';

      const label = document.createElement('div');
      label.className = 'string-label';
      label.textContent = muted ? '×' : openNote;
      if (muted) label.style.color = 'var(--muted)';
      row.appendChild(label);

      for (let f = 0; f <= FRET_COUNT; f++) {
        const note = noteAtFret(openNote, f);
        const w    = widths[f];
        const cell = document.createElement('div');
        cell.className = 'fret-cell' + (f === 0 ? ' fret-0' : '');
        cell.style.width = w + 'px';

        const isVoiced = voicing && voicedFret === f && !muted;
        if (isVoiced) {
          const dotSz = Math.min(26, Math.max(14, w - 8));
          const dot   = document.createElement('div');
          dot.className = 'fret-dot ' + (note === root ? 'root' : 'scale');
          dot.style.width  = dotSz + 'px';
          dot.style.height = dotSz + 'px';
          if (dotSz < 20) dot.style.fontSize = '0';
          dot.textContent = note;
          cell.appendChild(dot);
        }

        // Position markers between strings 3 and 4 from top
        if (rowIdx === 2 && MARKERS.has(f) && f !== 0) {
          const isDouble = f === 12 || f === 24;
          const group = document.createElement('div');
          group.className = 'fret-neck-dot-group';
          group.innerHTML = isDouble
            ? '<span class="fret-neck-dot"></span><span class="fret-neck-dot"></span>'
            : '<span class="fret-neck-dot"></span>';
          cell.appendChild(group);
        }

        cell.title = `String ${strIdx + 1} — Fret ${f}: ${note}`;
        row.appendChild(cell);
      }

      container.appendChild(row);
    });
  }

  // ── Render all ────────────────────────────────────────────────────────────

  function computeAndRender() {
    const strings    = TUNINGS[currentTuning] || TUNINGS['drop-b'];
    const rootIdx    = noteIndex(currentRoot);
    const chordNotes = currentDef.intervals.map(i => NOTES[(rootIdx + i) % 12]);

    voicings    = generateVoicings(strings, chordNotes, currentRoot);
    selectedIdx = 0;

    renderCards(strings, chordNotes);
    renderVoicingNeck(voicings[selectedIdx] || null, strings, currentRoot);
  }

  function renderCards(strings, chordNotes) {
    const wrap = document.getElementById('cf-cards');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (!voicings.length) {
      wrap.innerHTML = '<span style="color:var(--muted);font-size:13px">No voicings found for this chord in this tuning.</span>';
      return;
    }

    voicings.forEach((v, i) => {
      const card = document.createElement('div');
      card.className = 'cf-card' + (i === selectedIdx ? ' active' : '');

      const label = document.createElement('div');
      label.style.cssText = 'font-size:10px;color:var(--muted);text-align:center;margin-bottom:4px';
      const fretted = v.frets.filter(f => f > 0);
      label.textContent = fretted.length ? `Pos ${Math.min(...fretted)}` : 'Open';

      card.innerHTML = buildSvgDiagram(v, strings, currentRoot, chordNotes);
      card.appendChild(label);

      card.addEventListener('click', () => {
        selectedIdx = i;
        wrap.querySelectorAll('.cf-card').forEach((c, j) => {
          c.classList.toggle('active', j === i);
        });
        renderVoicingNeck(v, strings, currentRoot);
      });

      wrap.appendChild(card);
    });
  }

  // ── Tuning sync ───────────────────────────────────────────────────────────

  function syncFromNeckTuning(val) {
    const cfSel = document.getElementById('cf-tuning');
    if (cfSel && cfSel.value !== val) {
      cfSel.value = val;
      currentTuning = val;
      computeAndRender();
    }
  }

  function syncToNeckTuning(val) {
    const neckSel = document.getElementById('tuning-preset');
    if (neckSel && neckSel.value !== val) {
      neckSel.value = val;
      neckSel.dispatchEvent(new Event('change'));
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  let resizeTimer;

  function init() {
    const rootSel   = document.getElementById('cf-root');
    const typeSel   = document.getElementById('cf-chord-type');
    const tuningSel = document.getElementById('cf-tuning');

    rootSel.addEventListener('change', () => {
      currentRoot = rootSel.value;
      computeAndRender();
    });

    typeSel.addEventListener('change', () => {
      currentDef = CHORD_DEFS[typeSel.selectedIndex] || CHORD_DEFS[0];
      computeAndRender();
    });

    tuningSel.addEventListener('change', () => {
      currentTuning = tuningSel.value;
      syncToNeckTuning(tuningSel.value);
      computeAndRender();
    });

    // Sync from Neck tab tuning
    const neckTuningSel = document.getElementById('tuning-preset');
    if (neckTuningSel) {
      neckTuningSel.addEventListener('change', () => {
        syncFromNeckTuning(neckTuningSel.value);
      });
    }

    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const strings = TUNINGS[currentTuning] || TUNINGS['drop-b'];
        const rootIdx = noteIndex(currentRoot);
        const chordNotes = currentDef.intervals.map(i => NOTES[(rootIdx + i) % 12]);
        renderVoicingNeck(voicings[selectedIdx] || null, strings, currentRoot);
        renderCards(strings, chordNotes);
      }, 40);
    }).observe(document.getElementById('cf-neck-wrap'));

    computeAndRender();
  }

  return { init, syncFromNeckTuning };
})();
