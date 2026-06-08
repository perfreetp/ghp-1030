const chalk = require('chalk');
const { loadEntries } = require('../store');

function compare(opts) {
  if (!opts.id1 || !opts.id2) {
    console.error(chalk.red('错误: 请提供两个条目 ID (--id1 和 --id2)'));
    process.exit(1);
  }

  const entries = loadEntries();
  const e1 = entries.find(e => e.id === opts.id1);
  const e2 = entries.find(e => e.id === opts.id2);

  if (!e1) {
    console.error(chalk.red('错误: 找不到条目 --id1:'), opts.id1);
    process.exit(1);
  }
  if (!e2) {
    console.error(chalk.red('错误: 找不到条目 --id2:'), opts.id2);
    process.exit(1);
  }

  const name1 = `${e1.name || '(未命名)'} v${e1.version || '?'}`;
  const name2 = `${e2.name || '(未命名)'} v${e2.version || '?'}`;

  console.log(chalk.cyan('═══ 版本比较 ═══'));
  console.log(chalk.white('A:'), name1, chalk.gray(`(${e1.id})`));
  console.log(chalk.white('B:'), name2, chalk.gray(`(${e2.id})`));
  console.log();

  const f1 = new Set(e1.features || []);
  const f2 = new Set(e2.features || []);

  const onlyIn1 = [...f1].filter(f => !f2.has(f));
  const onlyIn2 = [...f2].filter(f => !f1.has(f));
  const common = [...f1].filter(f => f2.has(f));

  console.log(chalk.green(`A 独有功能 (${onlyIn1.length}):`));
  if (onlyIn1.length === 0) console.log(chalk.gray('  (无)'));
  onlyIn1.forEach(f => console.log(chalk.green('  + ' + f)));

  console.log();
  console.log(chalk.red(`B 独有功能 (${onlyIn2.length}):`));
  if (onlyIn2.length === 0) console.log(chalk.gray('  (无)'));
  onlyIn2.forEach(f => console.log(chalk.red('  - ' + f)));

  console.log();
  console.log(chalk.gray(`共有功能 (${common.length}):`));
  if (common.length === 0) console.log(chalk.gray('  (无)'));
  common.forEach(f => console.log(chalk.gray('  = ' + f)));

  console.log();
  const fields = ['company', 'year', 'description', 'link', 'interview', 'dispute'];
  console.log(chalk.cyan('═══ 其他字段差异 ═══'));
  for (const field of fields) {
    const v1 = e1[field] || '(空)';
    const v2 = e2[field] || '(空)';
    if (v1 !== v2) {
      console.log(chalk.yellow(`  ${field}:`));
      console.log(chalk.white('    A: '), v1);
      console.log(chalk.white('    B: '), v2);
    }
  }

  console.log();
  if (onlyIn1.length === 0 && onlyIn2.length === 0) {
    console.log(chalk.green('✓ 两个版本功能完全一致'));
  } else {
    console.log(chalk.yellow(`⚠ 功能差异: A 独有 ${onlyIn1.length} 项, B 独有 ${onlyIn2.length} 项`));
  }
}

module.exports = compare;
