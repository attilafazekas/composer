// Bootstrap
document.addEventListener('DOMContentLoaded', () => {

  // ── Tab routing ──
  const tabs    = document.querySelectorAll('.tab');
  const panels  = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ── Settings modal ──
  const modal       = document.getElementById('settings-modal');
  const keyInput    = document.getElementById('api-key-input');

  document.getElementById('settings-btn').addEventListener('click', () => {
    keyInput.value = Storage.getApiKey();
    modal.classList.remove('hidden');
  });
  document.getElementById('settings-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  document.getElementById('settings-save').addEventListener('click', () => {
    Storage.saveApiKey(keyInput.value.trim());
    modal.classList.add('hidden');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // ── Init modules ──
  Fretboard.init();
  Chords.init();
  ChordsTab.init();
});
