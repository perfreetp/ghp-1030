const chalk = require('chalk');
const { loadEntries, saveEntries } = require('../store');

const VALID_TYPES = ['predecessor', 'competitor', 'branch', 'acquired'];

const TYPE_LABELS = {
  predecessor: '前身',
  competitor: '竞品',
  branch: '分支版本',
  acquired: '收购改名',
};

function relate(opts) {
  if (!opts.id) {
    console.error(chalk.red('错误: 请提供条目 ID (--id)'));
    process.exit(1);
  }

  if (!opts.target) {
    console.error(chalk.red('错误: 请提供目标条目 ID (--target)'));
    process.exit(1);
  }

  if (!opts.type) {
    console.error(chalk.red('错误: 请提供关系类型 (--type)'));
    console.log(chalk.gray('可用类型:'));
    for (const [k, v] of Object.entries(TYPE_LABELS)) {
      console.log(chalk.gray(`  ${k} - ${v}`));
    }
    process.exit(1);
  }

  const type = opts.type.toLowerCase();
  if (!VALID_TYPES.includes(type)) {
    console.error(chalk.red('错误: 不支持的关系类型:'), opts.type);
    console.log(chalk.gray('可用类型:'), VALID_TYPES.join(', '));
    process.exit(1);
  }

  const entries = loadEntries();
  const source = entries.find(e => e.id === opts.id);
  const target = entries.find(e => e.id === opts.target);

  if (!source) {
    console.error(chalk.red('错误: 找不到源条目 ID:'), opts.id);
    process.exit(1);
  }

  if (!target) {
    console.error(chalk.red('错误: 找不到目标条目 ID:'), opts.target);
    process.exit(1);
  }

  if (opts.id === opts.target) {
    console.error(chalk.red('错误: 不能与自身建立关系'));
    process.exit(1);
  }

  if (!source.relations) source.relations = [];
  if (!target.relations) target.relations = [];

  const existing = source.relations.find(r => r.targetId === opts.target && r.type === type);
  if (existing) {
    console.log(chalk.yellow('⚠ 该关系已存在:'));
    console.log(chalk.gray(`  ${source.name || '(未命名)'} →[${TYPE_LABELS[type]}]→ ${target.name || '(未命名)'}`));
    return;
  }

  source.relations.push({
    type,
    targetId: opts.target,
    targetName: target.name ? (target.version ? `${target.name} v${target.version}` : target.name) : '(未命名)',
  });

  const reverseMap = {
    predecessor: 'successor',
    competitor: 'competitor',
    branch: 'forked-from',
    acquired: 'acquired-by',
  };

  const reverseLabels = {
    successor: '后续产品',
    competitor: '竞品',
    'forked-from': '衍生出',
    'acquired-by': '被收购方',
  };

  const reverseType = reverseMap[type];
  const existingReverse = target.relations.find(r => r.targetId === opts.id && r.type === reverseType);
  if (!existingReverse) {
    target.relations.push({
      type: reverseType,
      targetId: opts.id,
      targetName: source.name ? (source.version ? `${source.name} v${source.version}` : source.name) : '(未命名)',
    });
  }

  source.updatedAt = new Date().toISOString();
  target.updatedAt = new Date().toISOString();
  saveEntries(entries);

  console.log(chalk.green('✓ 关系已建立:'));
  console.log(chalk.white(`  ${source.name || '(未命名)'} →[${TYPE_LABELS[type]}]→ ${target.name || '(未命名)'}`));
  console.log(chalk.white(`  ${target.name || '(未命名)'} →[${reverseLabels[reverseType]}]→ ${source.name || '(未命名)'}`));
}

module.exports = relate;
