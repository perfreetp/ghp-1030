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
};
