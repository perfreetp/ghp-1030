const chalk = require('chalk');
const { loadHistory } = require('../store');

function history(opts) {
  let records = loadHistory();

  if (records.length === 0) {
    console.log(chalk.yellow('暂无变更记录'));
    return;
  }

  if (opts.id) {
    records = records.filter(r => r.entryIds && r.entryIds.includes(opts.id));
  }

  if (opts.action) {
    records = records.filter(r => r.action === opts.action);
  }

  if (opts.since) {
    records = records.filter(r => r.timestamp >= opts.since);
  }

  if (records.length === 0) {
    console.log(chalk.yellow('未找到匹配的变更记录'));
    return;
  }

  const limit = opts.limit ? parseInt(opts.limit) : records.length;
  records = records.slice(-limit);

  console.log(chalk.cyan('═══ 变更记录 ═══'));
  if (opts.id) console.log(chalk.gray(`条目筛选: ${opts.id}`));
  if (opts.action) console.log(chalk.gray(`操作筛选: ${opts.action}`));
  console.log();

  for (const r of records) {
    const time = new Date(r.timestamp).toLocaleString('zh-CN');
    console.log(chalk.white(`[${time}] ${r.action}`));
    if (r.summary) console.log(chalk.gray(`  ${r.summary}`));
    if (r.entryIds && r.entryIds.length > 0) {
      console.log(chalk.gray(`  条目: ${r.entryIds.join(', ')}`));
    }
    console.log();
  }

  console.log(chalk.gray(`共 ${records.length} 条记录`));
}

module.exports = history;
