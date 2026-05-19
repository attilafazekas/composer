const Storage = (() => {
  const SONG_KEY = 'composer-song';
  const KEY_KEY  = 'composer-api-key';

  const DEFAULT_SONG = {
    title: '',
    key: 'B',
    scale: 'minor',
    tuning: 'drop-b',
    sections: [],
  };

  function getSong() {
    try {
      const raw = localStorage.getItem(SONG_KEY);
      return raw ? JSON.parse(raw) : { ...DEFAULT_SONG };
    } catch {
      return { ...DEFAULT_SONG };
    }
  }

  function saveSong(song) {
    localStorage.setItem(SONG_KEY, JSON.stringify(song));
  }

  function getApiKey() {
    return localStorage.getItem(KEY_KEY) || '';
  }

  function saveApiKey(key) {
    localStorage.setItem(KEY_KEY, key);
  }

  return { getSong, saveSong, getApiKey, saveApiKey };
})();
