const fs = require('fs');
const path = require('path');

const STORE_DIR = 'kaoguguan-data';
const ENTRIES_FILE = 'entries.json';
const META_FILE = 'meta.json';
const HISTORY_FILE = 'history.json';
const CHECKLIST_FILE = 'checklist-state.json';

function getStoreDir() {
  return path.resolve(process.cwd(), STORE_DIR);
}

function getEntriesPath() {
  return path.join(getStoreDir(), ENTRIES_FILE);
}

function getMetaPath() {
  return path.join(getStoreDir(), META_FILE);
}

function isInitialized() {
  return fs.existsSync(getStoreDir()) && fs.existsSync(getEntriesPath());
}

function ensureInitialized() {
  if (!isInitialized()) {
    console.error('错误: 请先运行 kyg init 初始化考古馆');
    process.exit(1);
  }
}

function loadEntries() {
  ensureInitialized();
  const raw = fs.readFileSync(getEntriesPath(), 'utf-8');
  return JSON.parse(raw);
}

function saveEntries(entries) {
  ensureInitialized();
  fs.writeFileSync(getEntriesPath(), JSON.stringify(entries, null, 2), 'utf-8');
}

function loadMeta() {
  ensureInitialized();
  const raw = fs.readFileSync(getMetaPath(), 'utf-8');
  return JSON.parse(raw);
}

function saveMeta(meta) {
  ensureInitialized();
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const REQUIRED_FIELDS = ['name', 'version', 'company', 'year'];
const OPTIONAL_FIELDS = ['description', 'screenshot', 'link', 'interview', 'dispute', 'features', 'tags'];

function getMissingFields(entry) {
  const missing = [];
  for (const f of REQUIRED_FIELDS) {
    if (!entry[f]) missing.push(f);
  }
  const arrayFields = ['features', 'tags'];
  for (const f of OPTIONAL_FIELDS) {
    if (arrayFields.includes(f)) {
      if (!entry[f] || entry[f].length === 0) missing.push(f + ' (可选)');
    } else {
      if (!entry[f]) missing.push(f + ' (可选)');
    }
  }
  return missing;
}

function resolveScreenshotDest(storeDir, srcFilePath) {
  const screenshotDir = path.join(storeDir, 'screenshots');
  const baseName = path.basename(srcFilePath);
  let dest = path.join(screenshotDir, baseName);
  if (!fs.existsSync(dest)) return dest;
  const ext = path.extname(baseName);
  const nameNoExt = path.basename(baseName, ext);
  let counter = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(screenshotDir, `${nameNoExt}_${counter}${ext}`);
    counter++;
  }
  return dest;
}

function getHistoryPath() {
  return path.join(getStoreDir(), HISTORY_FILE);
}

function loadHistory() {
  ensureInitialized();
  const p = getHistoryPath();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveHistory(history) {
  ensureInitialized();
  fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), 'utf-8');
}

function appendHistory(action, entryIds, summary) {
  const history = loadHistory();
  history.push({
    timestamp: new Date().toISOString(),
    action,
    entryIds: entryIds || [],
    summary: summary || '',
  });
  saveHistory(history);
}

function getChecklistPath() {
  return path.join(getStoreDir(), CHECKLIST_FILE);
}

function loadChecklistState() {
  ensureInitialized();
  const p = getChecklistPath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveChecklistState(state) {
  ensureInitialized();
  fs.writeFileSync(getChecklistPath(), JSON.stringify(state, null, 2), 'utf-8');
}

function cleanupDanglingRelations(entries, deletedId) {
  const ids = new Set(entries.map(e => e.id));
  let cleaned = 0;
  for (const entry of entries) {
    if (!entry.relations) continue;
    const before = entry.relations.length;
    entry.relations = entry.relations.filter(r => {
      if (deletedId && r.targetId === deletedId) return false;
      if (!ids.has(r.targetId)) return false;
      return true;
    });
    if (entry.relations.length < before) cleaned += (before - entry.relations.length);
  }
  return cleaned;
}

module.exports = {
  STORE_DIR,
  getStoreDir,
  getEntriesPath,
  getMetaPath,
  isInitialized,
  ensureInitialized,
  loadEntries,
  saveEntries,
  loadMeta,
  saveMeta,
  generateId,
  getMissingFields,
  resolveScreenshotDest,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  loadHistory,
  saveHistory,
  appendHistory,
  loadChecklistState,
  saveChecklistState,
  cleanupDanglingRelations,
};
