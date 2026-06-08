const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { STORE_DIR, getStoreDir, isInitialized, loadEntries, saveEntries, appendHistory, getAuthor, resolveScreenshotDest, cleanupDanglingRelations } = require('../store');

let opts_global = {};

function unpack(opts) {
  opts_global = opts;
  const sourcePath = opts.dir ? path.resolve(opts.dir) : (opts.file ? path.resolve(opts.file) : null);

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error(chalk.red('错误: 请指定有效的来源 (--file zip文件 或 --dir 目录)'));
    process.exit(1);
  }

  const stat = fs.statSync(sourcePath);
  let importEntries = [];
  let importMeta = {};
  let importManifest = null;
  let importDataDir = null;

  if (stat.isFile() && path.extname(sourcePath).toLowerCase() === '.zip') {
    const result = extractFromZip(sourcePath);
    importEntries = result.entries;
    importMeta = result.meta;
    importManifest = result.manifest;
    importDataDir = result.dataDir;
  } else if (stat.isDirectory()) {
    const result = readFromDir(sourcePath);
    importEntries = result.entries;
    importMeta = result.meta;
    importManifest = result.manifest;
    importDataDir = result.dataDir;
  } else {
    console.error(chalk.red('错误: 不支持的来源格式，请使用 .zip 文件或目录'));
    process.exit(1);
  }

  console.log(chalk.cyan('═══ 研究包预览 ═══'));
  console.log();
  if (importManifest) {
    printManifest(importManifest);
  } else if (importMeta.name) {
    console.log(chalk.gray(`  馆藏名称: ${importMeta.name}`));
    console.log(chalk.gray(`  条目数: ${importEntries.length}`));
  }
  console.log();

  const initialized = isInitialized();

  if (!initialized) {
    console.log(chalk.cyan('当前目录无馆藏数据，将直接导入'));
    doOverwrite(sourcePath, stat);
    return;
  }

  const mode = opts.mode || 'preview';
  if (mode === 'preview') {
    console.log(chalk.yellow('当前为预览模式，未写入任何数据'));
    console.log();
    console.log(chalk.gray('使用 --mode overwrite 覆盖当前馆藏'));
    console.log(chalk.gray('使用 --mode merge 合并到当前馆藏'));
    return;
  }

  if (mode === 'overwrite') {
    doOverwrite(sourcePath, stat);
  } else if (mode === 'merge') {
    doMerge(importEntries, importMeta, sourcePath, stat, importDataDir);
  } else {
    console.error(chalk.red('错误: 不支持的模式:'), mode);
    console.log(chalk.gray('可用模式: preview, overwrite, merge'));
  }
}

function extractFromZip(zipPath) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  const tempDir = path.join(path.dirname(getStoreDir()), '.kyg-temp-' + Date.now());
  zip.extractAllTo(tempDir, true);

  let dataDir = tempDir;
  const possibleSubDir = path.join(tempDir, 'kaoguguan-data');
  if (fs.existsSync(possibleSubDir) && fs.existsSync(path.join(possibleSubDir, 'entries.json'))) {
    dataDir = possibleSubDir;
  }

  const result = readFromDataDir(dataDir);
  result.dataDir = dataDir;
  return result;
}

function readFromDir(sourceDir) {
  let dataDir = sourceDir;
  const possibleSubDir = path.join(sourceDir, 'kaoguguan-data');
  if (fs.existsSync(possibleSubDir) && fs.existsSync(path.join(possibleSubDir, 'entries.json'))) {
    dataDir = possibleSubDir;
  }
  const result = readFromDataDir(dataDir);
  result.dataDir = dataDir;
  return result;
}

function readFromDataDir(dataDir) {
  const entriesPath = path.join(dataDir, 'entries.json');
  if (!fs.existsSync(entriesPath)) {
    console.error(chalk.red('错误: 未找到有效的考古馆数据 (entries.json)'));
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
  let meta = {};
  const metaPath = path.join(dataDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }

  let manifest = null;
  const manifestPath = path.join(dataDir, 'MANIFEST.json');
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  return { entries, meta, manifest };
}

function printManifest(m) {
  console.log(chalk.cyan('  研究包信息:'));
  console.log(chalk.gray(`    馆藏名称: ${m.name || '未知'}`));
  console.log(chalk.gray(`    生成时间: ${m.generatedAt || '未知'}`));
  console.log(chalk.gray(`    条目数: ${m.entryCount || 0}`));
  console.log(chalk.gray(`    截图数: ${m.screenshotCount || 0}`));
  if (m.reportFiles && m.reportFiles.length > 0) {
    console.log(chalk.gray(`    报告文件: ${m.reportFiles.join(', ')}`));
  }
  if (m.fields) {
    console.log(chalk.gray(`    含公司: ${m.fields.withCompany}/${m.entryCount}`));
    console.log(chalk.gray(`    含年份: ${m.fields.withYear}/${m.entryCount}`));
    console.log(chalk.gray(`    含功能: ${m.fields.withFeatures}/${m.entryCount}`));
  }
}

function doOverwrite(sourcePath, stat) {
  const targetDir = getStoreDir();

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  if (stat.isFile()) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(sourcePath);
    zip.extractAllTo(path.dirname(targetDir), true);
  } else {
    let dataDir = sourcePath;
    const possibleSubDir = path.join(sourcePath, 'kaoguguan-data');
    if (fs.existsSync(possibleSubDir) && fs.existsSync(path.join(possibleSubDir, 'entries.json'))) {
      dataDir = possibleSubDir;
    }
    copyDirRecursive(dataDir, targetDir);
  }

  const author = getAuthor(opts_global);
  appendHistory('unpack-overwrite', [], `从 ${path.basename(sourcePath)} 覆盖导入`, author);

  console.log(chalk.green('✓ 馆藏已覆盖导入'));
  console.log(chalk.cyan('现在可以使用 kyg report、kyg scan、kyg compare 等命令继续操作'));
}

function doMerge(importEntries, importMeta, sourcePath, stat, importDataDir) {
  const targetDir = getStoreDir();
  const localEntries = loadEntries();
  const localIds = new Set(localEntries.map(e => e.id));

  let imported = 0;
  let conflicts = 0;
  const conflictList = [];

  for (const impEntry of importEntries) {
    const matchKey = `${(impEntry.name || '').toLowerCase()}|${(impEntry.version || '').toLowerCase()}`;
    const localMatches = localEntries.filter(e =>
      `${(e.name || '').toLowerCase()}|${(e.version || '').toLowerCase()}` === matchKey
    );
    const localMatch = localMatches.length > 0 ? localMatches[0] : null;

    if (!localMatch) {
      const newEntry = { ...impEntry };
      if (localIds.has(newEntry.id)) {
        newEntry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
      localEntries.push(newEntry);
      imported++;
      continue;
    }

    const diffs = findDiffs(localMatch, impEntry);
    if (diffs.length === 0) continue;

    conflicts++;
    conflictList.push({ local: localMatch, imported: impEntry, diffs });
  }

  if (importDataDir) {
    copyImportFiles(importDataDir, targetDir, importEntries, localEntries, imported);
  }

  if (conflicts === 0) {
    saveEntries(localEntries);
    const author = getAuthor(opts_global);
    appendHistory('unpack-merge', localEntries.slice(-imported).map(e => e.id), `从 ${path.basename(sourcePath)} 合并导入 ${imported} 条`, author);
    console.log(chalk.green(`✓ 合并完成: 新增 ${imported} 条，无冲突`));
    return;
  }

  console.log();
  console.log(chalk.yellow(`⚠ 发现 ${conflicts} 组冲突:`));
  console.log();

  for (let i = 0; i < conflictList.length; i++) {
    const { local: loc, imported: imp, diffs } = conflictList[i];
    const version = loc.version ? ` v${loc.version}` : '';
    const locCompany = loc.company || '(空)';
    const impCompany = imp.company || '(空)';
    console.log(chalk.white(`冲突 ${i + 1}: ${loc.name || '(未命名)'}${version}`));
    console.log(chalk.gray(`  本地 ID: ${loc.id} 公司: ${locCompany}`));
    console.log(chalk.gray(`  导入 ID: ${imp.id} 公司: ${impCompany}`));
    for (const d of diffs) {
      console.log(chalk.red(`  ${d.field}:`));
      console.log(chalk.gray(`    本地: ${d.localValue}`));
      console.log(chalk.gray(`    导入: ${d.importValue}`));
    }
    console.log();
  }

  const strategy = opts_global.strategy || 'merge';
  resolveConflicts(localEntries, conflictList, strategy);

  saveEntries(localEntries);
  const author = getAuthor(opts_global);
  appendHistory('unpack-merge', [], `从 ${path.basename(sourcePath)} 合并导入 ${imported} 条, 解决 ${conflicts} 组冲突(${strategy})`, author);

  console.log(chalk.green(`✓ 合并完成: 新增 ${imported} 条，解决 ${conflicts} 组冲突`));
}

function copyImportFiles(importDataDir, targetDir, importEntries, localEntries, importedCount) {
  const importScreenshots = path.join(importDataDir, 'screenshots');
  const targetScreenshots = path.join(targetDir, 'screenshots');

  if (fs.existsSync(importScreenshots)) {
    if (!fs.existsSync(targetScreenshots)) {
      fs.mkdirSync(targetScreenshots, { recursive: true });
    }
    const files = fs.readdirSync(importScreenshots);
    for (const file of files) {
      const srcPath = path.join(importScreenshots, file);
      if (fs.statSync(srcPath).isFile()) {
        const dest = resolveScreenshotDest(targetDir.replace(/[/\\]screenshots$/, ''), srcPath);
        fs.copyFileSync(srcPath, dest);
      }
    }
  }

  const mdFiles = fs.readdirSync(importDataDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  for (const file of mdFiles) {
    const srcPath = path.join(importDataDir, file);
    let destPath = path.join(targetDir, file);
    if (fs.existsSync(destPath)) {
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      let counter = 1;
      while (fs.existsSync(destPath)) {
        destPath = path.join(targetDir, `${base}_${counter}${ext}`);
        counter++;
      }
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(chalk.gray(`  + 报告文件已复制: ${path.basename(destPath)}`));
  }
}

function findDiffs(local, imported) {
  const diffs = [];
  const fields = ['company', 'year', 'description', 'link', 'interview', 'dispute'];

  for (const field of fields) {
    const lv = local[field] || '';
    const iv = imported[field] || '';
    if (lv !== iv) {
      diffs.push({ field, localValue: lv || '(空)', importValue: iv || '(空)' });
    }
  }

  const lf = (local.features || []).slice().sort().join(',');
  const if2 = (imported.features || []).slice().sort().join(',');
  if (lf !== if2) {
    diffs.push({
      field: 'features',
      localValue: (local.features || []).join(', ') || '(空)',
      importValue: (imported.features || []).join(', ') || '(空)',
    });
  }

  const lt = (local.tags || []).slice().sort().join(',');
  const it = (imported.tags || []).slice().sort().join(',');
  if (lt !== it) {
    diffs.push({
      field: 'tags',
      localValue: (local.tags || []).join(', ') || '(空)',
      importValue: (imported.tags || []).join(', ') || '(空)',
    });
  }

  return diffs;
}

function resolveConflicts(entries, conflictList, strategy) {
  for (const { local: loc, imported: imp, diffs } of conflictList) {
    if (strategy === 'local') continue;

    if (strategy === 'import') {
      for (const d of diffs) {
        if (d.field === 'features') {
          loc.features = imp.features || [];
        } else if (d.field === 'tags') {
          loc.tags = imp.tags || [];
        } else {
          loc[d.field] = imp[d.field] || '';
        }
      }
    }

    if (strategy === 'merge') {
      for (const d of diffs) {
        if (d.field === 'tags') {
          const merged = new Set([...(loc.tags || []), ...(imp.tags || [])]);
          loc.tags = [...merged];
        } else if (d.field === 'link') {
          const links = [];
          if (loc.link) links.push(loc.link);
          if (imp.link && imp.link !== loc.link) links.push(imp.link);
          loc.link = links.join(' | ');
        } else if (d.field === 'features') {
          const merged = new Set([...(loc.features || []), ...(imp.features || [])]);
          loc.features = [...merged];
        } else {
          if (!loc[d.field] && imp[d.field]) {
            loc[d.field] = imp[d.field];
          }
        }
      }
    }

    loc.updatedAt = new Date().toISOString();
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = unpack;
