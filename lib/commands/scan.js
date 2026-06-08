const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, saveEntries, getStoreDir, generateId, getMissingFields, resolveScreenshotDest } = require('../store');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp']);

function scanDirectory(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...scanDirectory(fullPath, exts));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (exts.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function scan(opts) {
  const scanDir = path.resolve(opts.dir);
  const exts = new Set(
    opts.ext.split(',').map(e => '.' + e.trim().toLowerCase().replace(/^\./, ''))
  );

  if (!fs.existsSync(scanDir)) {
    console.error(chalk.red('错误: 目录不存在:'), scanDir);
    process.exit(1);
  }

  console.log(chalk.cyan('扫描目录:'), scanDir);
  console.log(chalk.cyan('文件类型:'), [...exts].join(', '));
  console.log();

  const images = scanDirectory(scanDir, exts);
  if (images.length === 0) {
    console.log(chalk.yellow('未找到图片文件'));
    return;
  }

  console.log(chalk.green(`✓ 找到 ${images.length} 个图片文件:`));
  images.forEach(img => console.log(chalk.gray('  - ' + path.relative(scanDir, img))));

  const entries = loadEntries();
  const existingScreenshots = new Set(entries.map(e => e.screenshot).filter(Boolean));
  const storeDir = getStoreDir();
  let added = 0;
  let skipped = 0;

  for (const img of images) {
    const baseName = path.basename(img, path.extname(img));
    const dest = resolveScreenshotDest(storeDir, img);
    const relativePath = path.join('screenshots', path.basename(dest));

    if (existingScreenshots.has(relativePath)) {
      console.log(chalk.yellow('  跳过(条目已存在):'), path.basename(img));
      skipped++;
      continue;
    }

    fs.copyFileSync(img, dest);

    const entry = {
      id: generateId(),
      name: baseName,
      version: '',
      company: '',
      year: '',
      description: '',
      screenshot: relativePath,
      link: '',
      interview: '',
      dispute: '',
      features: [],
      tags: ['scanned'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    entries.push(entry);
    existingScreenshots.add(relativePath);
    added++;
    console.log(chalk.green('  + 已添加:'), baseName, chalk.gray(`(${path.basename(dest)})`));
  }

  saveEntries(entries);
  console.log();
  console.log(chalk.green(`✓ 新增 ${added} 个条目`));
  if (skipped > 0) console.log(chalk.gray(`  跳过 ${skipped} 个已有条目`));
  console.log(chalk.gray('提示: 使用 kyg tag 为条目补充公司和年份标签'));
}

module.exports = scan;
