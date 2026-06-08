const chalk = require('chalk');
const { loadEntries, saveEntries } = require('../store');

function batch(opts) {
  let entries = loadEntries();

  if (!opts.company && !opts.year && !opts.name) {
    console.error(chalk.red('错误: 请至少指定一个筛选条件 (--company, --year, --name)'));
    process.exit(1);
  }

  if (opts.company) {
    entries = entries.filter(e => e.company === opts.company);
  }
  if (opts.year) {
    entries = entries.filter(e => e.year === opts.year);
  }
  if (opts.name) {
    entries = entries.filter(e => e.name && e.name.includes(opts.name));
  }

  if (entries.length === 0) {
    console.log(chalk.yellow('未找到匹配的条目'));
    return;
  }

  const hasAction = opts.setTag || opts.setCompany || opts.setYear;
  if (!hasAction) {
    console.log(chalk.cyan('匹配到的条目:'));
    for (const e of entries) {
      const version = e.version ? ` v${e.version}` : '';
      const company = e.company ? ` [${e.company}]` : '';
      console.log(chalk.white(`  ◆ ${e.name || '(未命名)'}${version}${company}`), chalk.gray(`(${e.id})`));
    }
    console.log();
    console.log(chalk.gray('使用 --set-tag, --set-company, --set-year 执行批量操作'));
    console.log(chalk.gray('加 --confirm 确认写入'));
    return;
  }

  console.log(chalk.yellow(`⚠ 将影响 ${entries.length} 个条目:`));
  console.log();

  for (const e of entries) {
    const version = e.version ? ` v${e.version}` : '';
    const company = e.company ? ` [${e.company}]` : '';
    console.log(chalk.white(`  ◆ ${e.name || '(未命名)'}${version}${company}`), chalk.gray(`(${e.id})`));
  }

  console.log();
  console.log(chalk.cyan('将执行的操作:'));

  if (opts.setTag) {
    const newTags = opts.setTag.split(',').map(s => s.trim()).filter(Boolean);
    console.log(chalk.green(`  添加标签: ${newTags.join(', ')}`));
  }
  if (opts.setCompany) {
    console.log(chalk.green(`  设置公司: ${opts.setCompany}`));
  }
  if (opts.setYear) {
    console.log(chalk.green(`  设置年份: ${opts.setYear}`));
  }

  console.log();
  if (!opts.confirm) {
    console.log(chalk.yellow('如需确认执行，请加 --confirm 参数'));
    console.log(chalk.gray('  kyg batch --company "某公司" --set-tag "标签" --confirm'));
    return;
  }

  const allEntries = loadEntries();
  const entryMap = new Map(allEntries.map(e => [e.id, e]));

  let changed = 0;
  for (const target of entries) {
    const entry = entryMap.get(target.id);
    if (!entry) continue;

    if (opts.setTag) {
      const newTags = opts.setTag.split(',').map(s => s.trim()).filter(Boolean);
      if (!entry.tags) entry.tags = [];
      for (const t of newTags) {
        if (!entry.tags.includes(t)) {
          entry.tags.push(t);
        }
      }
    }

    if (opts.setCompany) {
      entry.company = opts.setCompany;
    }

    if (opts.setYear) {
      entry.year = opts.setYear;
    }

    entry.updatedAt = new Date().toISOString();
    changed++;
  }

  saveEntries(allEntries);

  console.log(chalk.green(`✓ 已更新 ${changed} 个条目`));
}

module.exports = batch;
