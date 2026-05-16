import {
  WORLD_POSITIONS_FILE_URL,
  WORLD_POSITIONS_AUTO_IMPORT,
  WORLD_POSITIONS_AUTO_DOWNLOAD_ON_GENERATE,
  WORLD_POSITIONS_DOWNLOAD_FILENAME,
} from '../../../config/constants.js';

// Persists randomly generated positions, to use later
const POSITIONS_SCHEMA_VERSION = 1;
const DOWNLOAD_SESSION_KEY = 'awitw.positions.downloaded';
const FILE_HANDLE_DB_NAME = 'awitw.positions.db';
const FILE_HANDLE_STORE_NAME = 'handles';
const FILE_HANDLE_KEY = 'worldPositionsFile';
const FILE_HANDLE_HINT_KEY = 'awitw.positions.workspaceHandleHint';

let cachedPositionsFileHandle = null;
let handlesDbPromise = null;

function supportsWorkspaceFileAccess() {
  return (
    typeof window !== 'undefined'
    && typeof window.showSaveFilePicker === 'function'
    && typeof indexedDB !== 'undefined'
  );
}

function openHandlesDb() {
  if (!supportsWorkspaceFileAccess()) return Promise.resolve(null);
  if (handlesDbPromise) return handlesDbPromise;

  handlesDbPromise = new Promise((resolve) => {
    const request = indexedDB.open(FILE_HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_HANDLE_STORE_NAME)) {
        db.createObjectStore(FILE_HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  return handlesDbPromise;
}

async function persistFileHandle(handle) {
  const db = await openHandlesDb();
  if (!db || !handle) return;

  await new Promise((resolve) => {
    try {
      const tx = db.transaction(FILE_HANDLE_STORE_NAME, 'readwrite');
      tx.objectStore(FILE_HANDLE_STORE_NAME).put(handle, FILE_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  try {
    localStorage.setItem(FILE_HANDLE_HINT_KEY, '1');
  } catch {
    // ignore localStorage failures
  }
}

async function loadPersistedFileHandle() {
  const db = await openHandlesDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(FILE_HANDLE_STORE_NAME, 'readonly');
      const request = tx.objectStore(FILE_HANDLE_STORE_NAME).get(FILE_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function ensureFileHandlePermission(handle, mode = 'readwrite') {
  if (!handle) return false;

  try {
    const options = { mode };
    if (typeof handle.queryPermission === 'function') {
      const current = await handle.queryPermission(options);
      if (current === 'granted') return true;
    }

    if (typeof handle.requestPermission === 'function') {
      const requested = await handle.requestPermission(options);
      return requested === 'granted';
    }

    return true;
  } catch {
    return false;
  }
}

function promptForPositionsFileHandle() {
  if (!supportsWorkspaceFileAccess()) return Promise.resolve(null);

  return window.showSaveFilePicker({
    suggestedName: WORLD_POSITIONS_DOWNLOAD_FILENAME,
    types: [
      {
        description: 'JSON file',
        accept: { 'application/json': ['.json'] },
      },
    ],
  }).catch(() => null);
}

async function getWritablePositionsFileHandle({ allowPrompt = false, promptFromGesture = false } = {}) {
  if (cachedPositionsFileHandle) {
    const hasPermission = await ensureFileHandlePermission(cachedPositionsFileHandle, 'readwrite');
    if (hasPermission) return cachedPositionsFileHandle;
    cachedPositionsFileHandle = null;
  }

  if (promptFromGesture && allowPrompt) {
    const promptedHandle = await promptForPositionsFileHandle();
    if (!promptedHandle) return null;

    const hasPermission = await ensureFileHandlePermission(promptedHandle, 'readwrite');
    if (!hasPermission) return null;

    cachedPositionsFileHandle = promptedHandle;
    await persistFileHandle(promptedHandle);
    return promptedHandle;
  }

  const persistedHandle = await loadPersistedFileHandle();
  if (persistedHandle) {
    const hasPermission = await ensureFileHandlePermission(persistedHandle, 'readwrite');
    if (hasPermission) {
      cachedPositionsFileHandle = persistedHandle;
      return persistedHandle;
    }
  }

  if (!allowPrompt) return null;

  const promptedHandle = await promptForPositionsFileHandle();
  if (!promptedHandle) return null;

  const hasPermission = await ensureFileHandlePermission(promptedHandle, 'readwrite');
  if (!hasPermission) return null;

  cachedPositionsFileHandle = promptedHandle;
  await persistFileHandle(promptedHandle);
  return promptedHandle;
}

async function parsePositionsObject(data) {
  const trees = normalizeTreePlacements(data?.trees);
  const grassPatches = normalizeGrassPatches(data?.grassPatches);

  return {
    trees,
    grassPatches,
  };
}

function toFinite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeTreePlacement(entry) {
  if (Array.isArray(entry)) {
    const x = toFinite(entry[0], 0);
    const y = toFinite(entry[1], 0);
    const z = toFinite(entry[2], 0);
    const rotationY = toFinite(entry[3], 0);
    return [x, y, z, rotationY];
  }

  if (!entry || typeof entry !== 'object') return null;

  const x = toFinite(entry.x, 0);
  const y = toFinite(entry.y, 0);
  const z = toFinite(entry.z, 0);
  const rotationY = toFinite(entry.rotationY, 0);
  return [x, y, z, rotationY];
}

function normalizeGrassPatch(entry) {
  if (Array.isArray(entry)) {
    const x = toFinite(entry[0], 0);
    const z = toFinite(entry[1], 0);
    const seed = (toFinite(entry[2], Math.random() * 0xFFFFFFFF) >>> 0);
    return [x, z, seed];
  }

  if (!entry || typeof entry !== 'object') return null;

  const x = toFinite(entry.x, 0);
  const z = toFinite(entry.z, 0);
  const seed = (toFinite(entry.seed, Math.random() * 0xFFFFFFFF) >>> 0);
  return [x, z, seed];
}

function normalizeTreePlacements(list) {
  if (!Array.isArray(list)) return [];

  const normalized = [];
  for (const entry of list) {
    const parsed = normalizeTreePlacement(entry);
    if (!parsed) continue;
    normalized.push(parsed);
  }

  return normalized;
}

function normalizeGrassPatches(list) {
  if (!Array.isArray(list)) return [];

  const normalized = [];
  for (const entry of list) {
    const parsed = normalizeGrassPatch(entry);
    if (!parsed) continue;
    normalized.push(parsed);
  }

  return normalized;
}

async function loadSavedWorldPositions() {
  if (!WORLD_POSITIONS_AUTO_IMPORT) return null;

  try {
    const response = await fetch(WORLD_POSITIONS_FILE_URL, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return parsePositionsObject(data);
    }
  } catch {
    // fallback to file handle read
  }

  try {
    const handle = await getWritablePositionsFileHandle();
    if (!handle) return null;

    const file = await handle.getFile();
    const text = await file.text();
    if (!text) return null;

    const data = JSON.parse(text);
    return parsePositionsObject(data);
  } catch {
    return null;
  }
}

function createWorldPositionsPayload({ trees = [], grassPatches = [] } = {}) {
  return {
    schemaVersion: POSITIONS_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    trees: normalizeTreePlacements(trees),
    grassPatches: normalizeGrassPatches(grassPatches),
  };
}

async function tryWriteGeneratedWorldPositionsToWorkspace(payload, options = {}) {
  if (!payload) return false;

  const shouldPromptFromGesture = Boolean(options.promptFromGesture);

  const handle = await getWritablePositionsFileHandle({
    allowPrompt: shouldPromptFromGesture,
    promptFromGesture: shouldPromptFromGesture,
  });
  if (!handle) return false;

  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();

    console.info(`Generated positions saved directly to ${WORLD_POSITIONS_FILE_URL}.`);
    return true;
  } catch {
    cachedPositionsFileHandle = null;
    return false;
  }
}

async function downloadGeneratedWorldPositions(payload, options = {}) {
  if (!payload) return;

  const savedToWorkspace = await tryWriteGeneratedWorldPositionsToWorkspace(payload, options);
  if (savedToWorkspace) return true;

  if (!WORLD_POSITIONS_AUTO_DOWNLOAD_ON_GENERATE && !options.forceDownload) return false;

  try {
    if (!options.forceDownload && sessionStorage.getItem(DOWNLOAD_SESSION_KEY) === '1') {
      return false;
    }
    sessionStorage.setItem(DOWNLOAD_SESSION_KEY, '1');
  } catch {
    // ignore sessionStorage failures (private mode / restrictions)
  }

  const serialized = JSON.stringify(payload, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = WORLD_POSITIONS_DOWNLOAD_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.info(
    `Generated positions downloaded as ${WORLD_POSITIONS_DOWNLOAD_FILENAME}. `
    + `Move it to ${WORLD_POSITIONS_FILE_URL} to reuse fixed placements.`
  );

  return true;
}

export {
  loadSavedWorldPositions,
  createWorldPositionsPayload,
  downloadGeneratedWorldPositions,
};