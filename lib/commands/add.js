const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, saveEntries, getStoreDir, generateId, getMissingFields } = require('../store');

function add(opts) {
  const entries = loadEntries();

  const entry = {
    id: generateId(),
    name: opts.name || '',
    version: opts.version || '',
    company: opts.company || '',
    year: opts.year || '',
    description: opts.description || '',
    screenshot: opts.screenshot || '',
    link: opts.link || '',
    interview: opts.interview || '',
    dispute: opts.dispute || '',
    features: opts.features ? opts.features.split(',').map(s => s.trim()).filter(Boolean) : [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (opts.screenshot) {
    const src = path.resolve(opts.screenshot);
    if (fs.existsSync(src)) {
      const destDir = path.join(getStoreDir(), 'screenshots');
      const dest = path.join(destDir, path.basename(src));
      fs.copyFileSync(src, dest);
      entry.screenshot = path.join('screenshots', path.basename(src));
      console.log(chalk.green('✓ 截图已复制:'), path.basename(src));
    } else {
      console.log(chalk.yellow('⚠ 截图文件不存在:'), opts.screenshot);
      entry.screenshot = opts.screenshot;
    }
  }

  entries.push(entry);
  saveEntries(entries);

  console.log(chalk.green('✓ 条目已添加'));
  console.log(chalk.gray('  ID:'), entry.id);
  console.log(chalk.gray('  名称:'), entry.name || '(未填写)');
  console.log(chalk.gray('  版本:'), entry.version || '(未填写)');

  const missing = getMissingFields(entry);
  if (missing.length > 0) {
    console.log();
    console.log(chalk.yellow('⚠ 缺失字段:'));
    missing.forEach(f => {
      console.log(chalk.yellow('  - ' + f));
    });
  }
}

module.exports = add;
