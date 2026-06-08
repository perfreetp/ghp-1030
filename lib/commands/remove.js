const chalk = require('chalk');
const { loadEntries, saveEntries, appendHistory, getAuthor, cleanupDanglingRelations } = require('../store');

function printEntry(e) {
  const version = e.version ? ` v${e.version}` : '';
  const company = e.company ? ` [${e.company}]` : '';
  console.log(chalk.white(`  名称: ${e.name || '(未命名)'}${version}${company}`));
  console.log(chalk.gray(`  ID: ${e.id}`));
  if (e.year) console.log(chalk.gray(`  年份: ${e.year}`));
  if (e.description) console.log(chalk.gray(`  说明: ${e.description}`));
  if (e.features && e.features.length > 0) console.log(chalk.gray(`  功能: ${e.features.join(', ')}`));
  if (e.screenshot) console.log(chalk.gray(`  截图: ${e.screenshot}`));
  if (e.link) console.log(chalk.gray(`  链接: ${e.link}`));
  if (e.interview) console.log(chalk.gray(`  访谈: ${e.interview}`));
  if (e.dispute) console.log(chalk.gray(`  争议: ${e.dispute}`));
  if (e.tags && e.tags.length > 0) console.log(chalk.gray(`  标签: ${e.tags.join(', ')}`));
  if (e.relations && e.relations.length > 0) console.log(chalk.gray(`  关系: ${e.relations.length} 条`));
}

function remove(opts) {
  if (!opts.id) {
    console.error(chalk.red('错误: 请提供条目 ID (--id)'));
    process.exit(1);
  }

  const entries = loadEntries();
  const index = entries.findIndex(e => e.id === opts.id);

  if (index === -1) {
    console.error(chalk.red('错误: 找不到条目 ID:'), opts.id);
    const ids = entries.map(e => `  ${e.id} - ${e.name || '(未命名)'}`);
    if (ids.length) {
      console.log(chalk.gray('现有条目:'));
      ids.forEach(i => console.log(chalk.gray(i)));
    }
    process.exit(1);
  }

  const entry = entries[index];

  console.log(chalk.yellow('⚠ 即将删除以下条目:'));
  console.log();
  printEntry(entry);
  console.log();

  if (!opts.confirm) {
    console.log(chalk.yellow('如需确认删除，请加 --confirm 参数'));
    console.log(chalk.gray('  kyg remove -i <ID> --confirm'));
    return;
  }

  const deletedName = entry.name || '(未命名)';
  const deletedId = entry.id;

  entries.splice(index, 1);

  const cleaned = cleanupDanglingRelations(entries, deletedId);
  if (cleaned > 0) {
    console.log(chalk.gray(`  已清理 ${cleaned} 条指向已删除条目的关系`));
  }

  saveEntries(entries);

  appendHistory('remove', [deletedId], `删除条目: ${deletedName}, 清理 ${cleaned} 条断链关系`, getAuthor(opts));

  console.log(chalk.green('✓ 条目已删除'));
  console.log(chalk.gray(`  剩余条目: ${entries.length}`));
}

module.exports = remove;
