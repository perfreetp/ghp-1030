const chalk = require('chalk');
const { loadEntries, saveEntries } = require('../store');

function tag(opts) {
  const entries = loadEntries();
  const entry = entries.find(e => e.id === opts.id);

  if (!entry) {
    console.error(chalk.red('错误: 找不到条目 ID:'), opts.id);
    const ids = entries.map(e => `  ${e.id} - ${e.name || '(未命名)'}`);
    if (ids.length) {
      console.log(chalk.gray('现有条目:'));
      ids.forEach(i => console.log(chalk.gray(i)));
    }
    process.exit(1);
  }

  if (opts.company) {
    entry.company = opts.company;
    console.log(chalk.green('✓ 公司标签已设置:'), opts.company);
  }

  if (opts.year) {
    entry.year = opts.year;
    console.log(chalk.green('✓ 年份标签已设置:'), opts.year);
  }

  if (opts.tags) {
    const newTags = opts.tags.split(',').map(s => s.trim()).filter(Boolean);
    entry.tags = [...new Set([...(entry.tags || []), ...newTags])];
    console.log(chalk.green('✓ 自定义标签已添加:'), newTags.join(', '));
  }

  if (!opts.company && !opts.year && !opts.tags) {
    console.log(chalk.gray('当前标签:'));
    console.log(chalk.gray('  公司:'), entry.company || '(未设置)');
    console.log(chalk.gray('  年份:'), entry.year || '(未设置)');
    console.log(chalk.gray('  自定义:'), (entry.tags || []).join(', ') || '(无)');
    return;
  }

  entry.updatedAt = new Date().toISOString();
  saveEntries(entries);
}

module.exports = tag;
