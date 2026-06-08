const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, saveEntries, getStoreDir, generateId } = require('../store');

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
  const screenshotDir = path.join(getStoreDir(), 'screenshots');
  let added = 0;

  for (const img of images) {
    const baseName = path.basename(img, path.extname(img));
    const dest = path.join(screenshotDir, path.basename(img));

    if (!fs.existsSync(dest)) {
      fs.copyFileSync(img, dest);
    }

    const existing = entries.find(
      e => e.screenshot === path.join('screenshots', path.basename(img))
    );
    if (existing) {
      console.log(chalk.yellow('  跳过(已存在):'), path.basename(img));
      continue;
    }

    const entry = {
      id: generateId(),
      name: baseName,
      version: '',
      company: '',
      year: '',
      description: '',
      screenshot: path.join('screenshots', path.basename(img)),
      link: '',
      interview: '',
      dispute: '',
      features: [],
      tags: ['scanned'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    entries.push(entry);
    added++;
    console.log(chalk.green('  + 已添加:'), baseName);
  }

  saveEntries(entries);
  console.log();
  console.log(chalk.green(`✓ 共添加 ${added} 个新条目`));
  console.log(chalk.gray('提示: 使用 kyg tag 为条目补充公司和年份标签'));
}

module.exports = scan;
