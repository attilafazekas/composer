const Lyrics = (() => {
  const DEFAULT_SECTIONS = [
    { id: 's1', label: 'Verse 1',  lyrics: '', chords: '' },
    { id: 's2', label: 'Chorus',   lyrics: '', chords: '' },
  ];

  let activeSectionId = null;
  let claudeHistory = [];
  let isLoading = false;

  function getSong() {
    return Storage.getSong();
  }

  function save() {
    Storage.saveSong(getSong());
    Structure.render();
  }

  function renderSections() {
    const song = getSong();
    const list = document.getElementById('sections-list');
    list.innerHTML = '';

    song.sections.forEach(sec => {
      const block = document.createElement('div');
      block.className = 'section-block' + (sec.id === activeSectionId ? ' active' : '');
      block.dataset.id = sec.id;
      block.innerHTML = `
        <div class="section-block-header">
          <input class="section-label-input" value="${esc(sec.label)}" placeholder="Section name" />
          <input class="section-chords-input" value="${esc(sec.chords)}" placeholder="Chords…" />
          <button class="section-remove" title="Remove section">×</button>
        </div>
        <textarea class="section-lyrics-input" placeholder="Write lyrics here…" rows="5">${esc(sec.lyrics)}</textarea>`;

      block.querySelector('.section-label-input').addEventListener('input', e => {
        sec.label = e.target.value;
        save();
      });
      block.querySelector('.section-chords-input').addEventListener('input', e => {
        sec.chords = e.target.value;
        save();
      });
      block.querySelector('.section-lyrics-input').addEventListener('input', e => {
        sec.lyrics = e.target.value;
        save();
      });
      block.querySelector('.section-lyrics-input').addEventListener('focus', () => {
        activeSectionId = sec.id;
        renderSections();
      });
      block.querySelector('.section-remove').addEventListener('click', () => {
        song.sections = song.sections.filter(s => s.id !== sec.id);
        if (activeSectionId === sec.id) activeSectionId = null;
        save();
        renderSections();
      });

      list.appendChild(block);
    });
  }

  function addSection() {
    const song = getSong();
    const id = 's' + Date.now();
    song.sections.push({ id, label: 'New Section', lyrics: '', chords: '' });
    activeSectionId = id;
    save();
    renderSections();
    Structure.render();
    // Focus the new section's label input
    setTimeout(() => {
      const input = document.querySelector(`[data-id="${id}"] .section-label-input`);
      if (input) { input.focus(); input.select(); }
    }, 50);
  }

  // ── Claude ──

  function getActiveSection() {
    const song = getSong();
    return song.sections.find(s => s.id === activeSectionId) || song.sections[0];
  }

  function appendClaudeMsg(role, text) {
    const msgs = document.getElementById('claude-messages');
    const div = document.createElement('div');
    div.className = `claude-msg ${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function askClaude(prompt) {
    if (isLoading) return;
    const key = Storage.getApiKey();
    if (!key) {
      appendClaudeMsg('error', 'No API key. Click ⚙ to add one.');
      return;
    }

    const section = getActiveSection();
    const contextText = section
      ? `Section: "${section.label}"\nChords: ${section.chords || 'none'}\nLyrics:\n${section.lyrics}`
      : '';

    const userMsg = contextText
      ? `${prompt}\n\n---\n${contextText}`
      : prompt;

    appendClaudeMsg('user', prompt);
    claudeHistory.push({ role: 'user', content: userMsg });

    isLoading = true;
    const sendBtn = document.getElementById('claude-send');
    sendBtn.disabled = true;

    const loader = document.createElement('div');
    loader.className = 'claude-msg assistant';
    loader.textContent = '…';
    loader.id = 'claude-loader';
    document.getElementById('claude-messages').appendChild(loader);
    document.getElementById('claude-messages').scrollTop = 9999;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: 'You are a creative songwriting assistant. Help the user write, improve, and develop song lyrics. Be concise and creative. When suggesting lines or rewrites, just give the output — no preamble.',
          messages: claudeHistory,
        }),
      });

      document.getElementById('claude-loader')?.remove();

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content[0].text;
      claudeHistory.push({ role: 'assistant', content: reply });
      appendClaudeMsg('assistant', reply);

    } catch (e) {
      document.getElementById('claude-loader')?.remove();
      appendClaudeMsg('error', e.message);
      claudeHistory.pop();
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
    }
  }

  function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function init() {
    const song = getSong();
    if (!song.sections || !song.sections.length) {
      song.sections = DEFAULT_SECTIONS.map(s => ({ ...s }));
      Storage.saveSong(song);
    }

    document.getElementById('song-title').value = song.title || '';
    document.getElementById('song-title').addEventListener('input', e => {
      getSong().title = e.target.value;
      save();
    });

    renderSections();

    document.getElementById('add-section-btn').addEventListener('click', addSection);

    // Claude
    document.getElementById('claude-send').addEventListener('click', () => {
      const input = document.getElementById('claude-input');
      const text = input.value.trim();
      if (text) { askClaude(text); input.value = ''; }
    });

    document.getElementById('claude-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('claude-send').click();
      }
    });

    document.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => askClaude(btn.dataset.prompt));
    });

    document.getElementById('claude-toggle').addEventListener('click', () => {
      document.getElementById('claude-panel').classList.remove('visible');
    });

    document.getElementById('show-claude-btn').addEventListener('click', () => {
      document.getElementById('claude-panel').classList.add('visible');
    });
  }

  function refresh() {
    const song = getSong();
    document.getElementById('song-title').value = song.title || '';
    renderSections();
  }

  return { init, refresh, renderSections };
})();
