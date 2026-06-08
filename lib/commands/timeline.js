const chalk = require('chalk');
const { loadEntries } = require('../store');

const TYPE_LABELS = {
  predecessor: '前身',
  competitor: '竞品',
  branch: '分支版本',
  acquired: '收购改名',
  successor: '后续产品',
  'forked-from': '衍生出',
  'acquired-by': '被收购方',
};

function timeline(opts) {
  const entries = loadEntries();
  if (entries.length === 0) {
    console.log(chalk.yellow('馆藏为空，请先添加条目'));
    return;
  }

  let filtered = entries;
  if (opts.company) {
    filtered = filtered.filter(e => e.company === opts.company);
  }
  if (opts.name) {
    filtered = filtered.filter(e => e.name && e.name.includes(opts.name));
  }

  if (filtered.length === 0) {
    console.log(chalk.yellow('未找到匹配的条目'));
    return;
  }

  const entryMap = new Map(entries.map(e => [e.id, e]));

  filtered.sort((a, b) => {
    const ya = parseInt(a.year) || 9999;
    const yb = parseInt(b.year) || 9999;
    if (ya !== yb) return ya - yb;
    return a.name.localeCompare(b.name);
  });

  console.log(chalk.cyan('═══ 产品时间线 ═══'));
  if (opts.company) console.log(chalk.gray('公司筛选:'), opts.company);
  if (opts.name) console.log(chalk.gray('名称筛选:'), opts.name);
  console.log();

  let currentYear = null;
  for (const entry of filtered) {
    const year = entry.year || '未知年份';
    if (year !== currentYear) {
      currentYear = year;
      console.log(chalk.cyan.bold(`\n📅 ${year}`));
      console.log(chalk.cyan('─'.repeat(40)));
    }

    const version = entry.version ? ` v${entry.version}` : '';
    const company = entry.company ? ` [${entry.company}]` : '';
    const name = entry.name || '(未命名)';

    console.log(chalk.white(`  ◆ ${name}${version}${company}`));
    console.log(chalk.gray(`    ID: ${entry.id}`));

    if (entry.features && entry.features.length > 0) {
      console.log(chalk.gray(`    功能: ${entry.features.join(', ')}`));
    }
    if (entry.dispute) {
      console.log(chalk.yellow(`    ⚠ 争议: ${entry.dispute}`));
    }
    if (entry.link) {
      console.log(chalk.blue(`    🔗 ${entry.link}`));
    }

    if (entry.relations && entry.relations.length > 0) {
      for (const rel of entry.relations) {
        const label = TYPE_LABELS[rel.type] || rel.type;
        const target = entryMap.get(rel.targetId);
        const targetName = target ? `${target.name || '(未命名)'}${target.version ? ` v${target.version}` : ''}` : rel.targetName || rel.targetId;
        console.log(chalk.magenta(`    ↗ ${label}: ${targetName}`));
      }
    }
  }

  console.log();
  console.log(chalk.gray(`共 ${filtered.length} 个条目`));
}

module.exports = timeline;
