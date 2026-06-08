const fs = require('fs');
const path = require('path');

const STORE_DIR = 'kaoguguan-data';
const ENTRIES_FILE = 'entries.json';
const META_FILE = 'meta.json';

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
  for (const f of OPTIONAL_FIELDS) {
    if (!entry[f]) missing.push(f + ' (可选)');
  }
  return missing;
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
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
};
