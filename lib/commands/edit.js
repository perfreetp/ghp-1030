const chalk = require('chalk');
const { loadEntries, saveEntries, getMissingFields } = require('../store');

function edit(opts) {
  if (!opts.id) {
    console.error(chalk.red('错误: 请提供条目 ID (--id)'));
    process.exit(1);
  }

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

  let changed = false;

  if (opts.name !== undefined) { entry.name = opts.name; changed = true; }
  if (opts.version !== undefined) { entry.version = opts.version; changed = true; }
  if (opts.company !== undefined) { entry.company = opts.company; changed = true; }
  if (opts.year !== undefined) { entry.year = opts.year; changed = true; }
  if (opts.description !== undefined) { entry.description = opts.description; changed = true; }
  if (opts.link !== undefined) { entry.link = opts.link; changed = true; }
  if (opts.interview !== undefined) { entry.interview = opts.interview; changed = true; }
  if (opts.dispute !== undefined) { entry.dispute = opts.dispute; changed = true; }

  if (opts.features !== undefined) {
    entry.features = opts.features.split(',').map(s => s.trim()).filter(Boolean);
    changed = true;
  }

  if (opts.tags !== undefined) {
    entry.tags = opts.tags.split(',').map(s => s.trim()).filter(Boolean);
    changed = true;
  }

  if (!changed) {
    console.log(chalk.cyan('当前条目信息:'));
    console.log(chalk.gray('  ID:'), entry.id);
    console.log(chalk.gray('  名称:'), entry.name || '(未填写)');
    console.log(chalk.gray('  版本:'), entry.version || '(未填写)');
    console.log(chalk.gray('  公司:'), entry.company || '(未填写)');
    console.log(chalk.gray('  年份:'), entry.year || '(未填写)');
    console.log(chalk.gray('  说明:'), entry.description || '(未填写)');
    console.log(chalk.gray('  功能:'), (entry.features || []).join(', ') || '(未填写)');
    console.log(chalk.gray('  链接:'), entry.link || '(未填写)');
    console.log(chalk.gray('  访谈:'), entry.interview || '(未填写)');
    console.log(chalk.gray('  争议:'), entry.dispute || '(未填写)');
    console.log(chalk.gray('  标签:'), (entry.tags || []).join(', ') || '(未填写)');
    console.log();
    console.log(chalk.yellow('提示: 使用选项来修改字段，例如:'));
    console.log(chalk.gray('  kyg edit -i <ID> -n "新名称" -v "2.0" -f "功能A,功能B"'));
    return;
  }

  entry.updatedAt = new Date().toISOString();
  saveEntries(entries);

  console.log(chalk.green('✓ 条目已更新'));
  console.log(chalk.gray('  ID:'), entry.id);
  console.log(chalk.gray('  名称:'), entry.name || '(未填写)');
  console.log(chalk.gray('  版本:'), entry.version || '(未填写)');

  const missing = getMissingFields(entry);
  if (missing.length > 0) {
    console.log();
    console.log(chalk.yellow('⚠ 仍缺失字段:'));
    missing.forEach(f => {
      console.log(chalk.yellow('  - ' + f));
    });
  }
}

module.exports = edit;
