const Structure = (() => {
  let dragSrcIdx = null;

  function getSong() {
    return Storage.getSong();
  }

  function render() {
    const song = getSong();
    const timeline = document.getElementById('structure-timeline');
    const titleEl  = document.getElementById('structure-song-title');
    if (titleEl) titleEl.textContent = song.title || 'Song Structure';

    timeline.innerHTML = '';

    song.sections.forEach((sec, i) => {
      const block = document.createElement('div');
      block.className = 'structure-block';
      block.draggable = true;
      block.dataset.idx = i;

      const preview = sec.lyrics
        ? sec.lyrics.split('\n')[0].slice(0, 60) + (sec.lyrics.length > 60 ? '…' : '')
        : '—';

      block.innerHTML = `
        <div class="sb-label">${esc(sec.label)}</div>
        <div class="sb-preview">${esc(preview)}</div>
        ${sec.chords ? `<div class="sb-chords">${esc(sec.chords)}</div>` : ''}`;

      block.addEventListener('dragstart', (e) => {
        dragSrcIdx = i;
        e.dataTransfer.effectAllowed = 'move';
        block.style.opacity = '0.5';
      });
      block.addEventListener('dragend', () => {
        block.style.opacity = '';
        document.querySelectorAll('.structure-block').forEach(b => b.classList.remove('drag-over'));
      });
      block.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        block.classList.add('drag-over');
      });
      block.addEventListener('dragleave', () => block.classList.remove('drag-over'));
      block.addEventListener('drop', (e) => {
        e.preventDefault();
        block.classList.remove('drag-over');
        const targetIdx = parseInt(block.dataset.idx);
        if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
        const sections = song.sections;
        const moved = sections.splice(dragSrcIdx, 1)[0];
        sections.splice(targetIdx, 0, moved);
        dragSrcIdx = null;
        Storage.saveSong(song);
        render();
        Lyrics.renderSections();
      });

      timeline.appendChild(block);
    });
  }

  function init() {
    document.getElementById('structure-add-btn').addEventListener('click', () => {
      const song = getSong();
      song.sections.push({ id: 's' + Date.now(), label: 'New Section', lyrics: '', chords: '' });
      Storage.saveSong(song);
      render();
      Lyrics.renderSections();
    });

    render();
  }

  function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, render };
})();
