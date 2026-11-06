import { CLOUD_INDEX_SEED, CLOUD_FILES_SEED } from './cloudSeedData.js';

const STORAGE_INDEX_KEY = 'cube_cloud_index_v1';
const STORAGE_FILES_KEY = 'cube_cloud_files_v1';
const GITHUB_TOKEN_KEY = 'cube_github_token';

// Inicjalizacja lub odczyt pamięci lokalnej
function getStoredIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.locations)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Błąd odczytu lokalnego indeksu chmury:', e);
  }

  // Użyj domyślnego seedu
  const seedCopy = JSON.parse(JSON.stringify(CLOUD_INDEX_SEED));
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(seedCopy));
  } catch (e) {}
  return seedCopy;
}

function saveStoredIndex(indexData) {
  try {
    indexData.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(indexData));
  } catch (e) {
    console.warn('Nie udało się zapisać indeksu w localStorage:', e);
  }
}

function getStoredFile(pathKey) {
  try {
    const filesRaw = localStorage.getItem(STORAGE_FILES_KEY);
    if (filesRaw) {
      const filesMap = JSON.parse(filesRaw);
      if (filesMap && filesMap[pathKey]) {
        return filesMap[pathKey];
      }
    }
  } catch (e) {}

  if (CLOUD_FILES_SEED && CLOUD_FILES_SEED[pathKey]) {
    return CLOUD_FILES_SEED[pathKey];
  }
  return null;
}

function saveStoredFile(pathKey, fileData) {
  try {
    let filesMap = {};
    const filesRaw = localStorage.getItem(STORAGE_FILES_KEY);
    if (filesRaw) {
      try { filesMap = JSON.parse(filesRaw); } catch (e) {}
    }
    filesMap[pathKey] = fileData;
    localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(filesMap));
  } catch (e) {
    console.warn('Nie udało się zapisać pliku w localStorage:', e);
  }
}

// Pobierz listę wszystkich lokalizacji
export async function getCloudLocations() {
  const index = getStoredIndex();

  // Spróbuj pobrać najnowszy stan w tle (gdy jesteśmy online/na serwerze)
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/cloud-saves', { method: 'GET' });
      if (res.ok) {
        const remoteIndex = await res.json();
        if (remoteIndex && Array.isArray(remoteIndex.locations)) {
          // Scal lokalizacje i zachowaj lokalne nowe zapisy
          mergeRemoteIndex(index, remoteIndex);
          saveStoredIndex(index);
        }
      }
    } catch (e) {
      // Cicho ignoruj - tryb offline/lokalny działa bez przeszkód
    }
  }

  return index.locations || [];
}

// Scalanie zdalnego indeksu z lokalnym
function mergeRemoteIndex(localIndex, remoteIndex) {
  if (!remoteIndex || !Array.isArray(remoteIndex.locations)) return;

  for (const rLoc of remoteIndex.locations) {
    const lLoc = localIndex.locations.find(l => l.id === rLoc.id);
    if (!lLoc) {
      localIndex.locations.push(rLoc);
    } else {
      for (const rSave of rLoc.saves || []) {
        const existing = (lLoc.saves || []).find(s => s.filename === rSave.filename);
        if (!existing) {
          lLoc.saves.push(rSave);
        } else if (new Date(rSave.updatedAt) > new Date(existing.updatedAt)) {
          Object.assign(existing, rSave);
        }
      }
    }
  }
}

// Pobierz listę zapisów dla wybranej lokalizacji
export async function getSavesForLocation(locationId) {
  const locations = await getCloudLocations();
  const loc = locations.find(l => l.id === locationId);
  return loc && loc.saves ? loc.saves : [];
}

// Wczytaj plik zapisu z chmury
export async function loadCloudSave(locationId, filename) {
  const pathKey = `${locationId}/${filename}`;

  // 1. Sprawdź lokalny magazyn i seed
  const cached = getStoredFile(pathKey);
  if (cached) {
    return cached;
  }

  // 2. Jeśli jesteśmy online / HTTP, pobierz z serwera
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch(`/api/cloud-saves?locationId=${encodeURIComponent(locationId)}&file=${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        saveStoredFile(pathKey, data);
        return data;
      }
    } catch (e) {
      console.warn('Błąd pobierania pliku z serwera:', e);
    }

    try {
      const staticRes = await fetch(`chmura_zapisy/${locationId}/${filename}`);
      if (staticRes.ok) {
        const data = await staticRes.json();
        saveStoredFile(pathKey, data);
        return data;
      }
    } catch (e) {}
  }

  throw new Error(`Nie odnaleziono pliku ${filename} dla lokalizacji ${locationId}`);
}

// Zapisz projekt w chmurze
export async function saveToCloud(locationId, saveName, scheduleData) {
  if (!locationId) throw new Error('Nie wybrano lokalizacji.');
  if (!saveName || !saveName.trim()) throw new Error('Wpisz nazwę zapisu.');

  const trimmedName = saveName.trim();
  // Utwórz bezpieczną nazwę pliku
  let safeBaseName = trimmedName
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, c => ({ 'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z' })[c] || c)
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!safeBaseName) safeBaseName = 'grafik';
  const filename = safeBaseName.endsWith('.json') ? safeBaseName : `${safeBaseName}.json`;
  const pathKey = `${locationId}/${filename}`;
  const nowIso = new Date().toISOString();

  // 1. Zapisz natychmiast w pamięci lokalnej (gwarancja braku utraty danych)
  saveStoredFile(pathKey, scheduleData);

  // 2. Zaktualizuj indeks lokalny
  const index = getStoredIndex();
  let loc = index.locations.find(l => l.id === locationId);
  if (!loc) {
    loc = { id: locationId, city: locationId, street: '', saves: [] };
    index.locations.push(loc);
  }
  if (!Array.isArray(loc.saves)) loc.saves = [];

  const existingSaveIndex = loc.saves.findIndex(s => s.filename === filename);
  const jsonStr = JSON.stringify(scheduleData, null, 2);
  const saveEntry = {
    id: filename.replace(/\.json$/, ''),
    filename: filename,
    name: trimmedName,
    updatedAt: nowIso,
    size: jsonStr.length
  };

  if (existingSaveIndex >= 0) {
    loc.saves[existingSaveIndex] = saveEntry;
  } else {
    loc.saves.unshift(saveEntry); // dodaj na początek
  }

  saveStoredIndex(index);

  // 3. Jeśli jesteśmy online / na Vercel, wyślij do API chmury (zapis do GitHub)
  let cloudSyncStatus = 'local';
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const apiRes = await fetch('/api/cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          filename,
          data: scheduleData,
          title: trimmedName
        })
      });

      if (apiRes.ok) {
        const result = await apiRes.json();
        cloudSyncStatus = result.githubSynced ? 'github' : 'server';
      }
    } catch (apiErr) {
      console.warn('Synchronizacja z serwerem w tle nie powiodła się:', apiErr);
    }
  }

  return {
    success: true,
    locationId,
    filename,
    name: trimmedName,
    updatedAt: nowIso,
    cloudSyncStatus
  };
}
