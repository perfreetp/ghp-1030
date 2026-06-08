const chalk = require('chalk');
const { loadEntries, saveEntries, appendHistory, getAuthor, cleanupDanglingRelations } = require('../store');

const VALID_TYPES = ['predecessor', 'competitor', 'branch', 'acquired'];

const TYPE_LABELS = {
  predecessor: '前身',
  competitor: '竞品',
  branch: '分支版本',
  acquired: '收购改名',
  successor: '后续产品',
  'forked-from': '衍生出',
  'acquired-by': '被收购方',
};

function relate(opts) {
  if (opts.check) {
    checkBroken();
    return;
  }

  if (opts.list) {
    listRelations(opts);
    return;
  }

  if (opts.delete) {
    deleteRelation(opts);
    return;
  }

  addRelation(opts);
}

function addRelation(opts) {
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
      if (VALID_TYPES.includes(k)) {
        console.log(chalk.gray(`  ${k} - ${v}`));
      }
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

  appendHistory('relate-add', [opts.id, opts.target], `${source.name} →[${TYPE_LABELS[type]}]→ ${target.name}`, getAuthor(opts));

  console.log(chalk.green('✓ 关系已建立:'));
  console.log(chalk.white(`  ${source.name || '(未命名)'} →[${TYPE_LABELS[type]}]→ ${target.name || '(未命名)'}`));
  console.log(chalk.white(`  ${target.name || '(未命名)'} →[${TYPE_LABELS[reverseType]}]→ ${source.name || '(未命名)'}`));
}

function listRelations(opts) {
  const id = opts.id;
  if (!id) {
    console.error(chalk.red('错误: 请提供条目 ID (--id 配合 --list)'));
    process.exit(1);
  }

  const entries = loadEntries();
  const entry = entries.find(e => e.id === id);

  if (!entry) {
    console.error(chalk.red('错误: 找不到条目 ID:'), id);
    process.exit(1);
  }

  const version = entry.version ? ` v${entry.version}` : '';
  const company = entry.company ? ` [${entry.company}]` : '';
  console.log(chalk.cyan(`${entry.name || '(未命名)'}${version}${company} 的关系:`));

  if (!entry.relations || entry.relations.length === 0) {
    console.log(chalk.gray('  (无关系)'));
    return;
  }

  const entryMap = new Map(entries.map(e => [e.id, e]));
  for (const rel of entry.relations) {
    const label = TYPE_LABELS[rel.type] || rel.type;
    const target = entryMap.get(rel.targetId);
    const status = target ? '' : chalk.red(' [已断链]');
    console.log(chalk.white(`  → ${label}: ${rel.targetName || rel.targetId}${status}`));
  }
}

function deleteRelation(opts) {
  if (!opts.id) {
    console.error(chalk.red('错误: 请提供源条目 ID (--id)'));
    process.exit(1);
  }

  if (!opts.target) {
    console.error(chalk.red('错误: 请提供目标条目 ID (--target)'));
    process.exit(1);
  }

  const entries = loadEntries();
  const source = entries.find(e => e.id === opts.id);

  if (!source) {
    console.error(chalk.red('错误: 找不到源条目 ID:'), opts.id);
    process.exit(1);
  }

  if (!source.relations || source.relations.length === 0) {
    console.log(chalk.yellow('该条目没有任何关系'));
    return;
  }

  const type = opts.type ? opts.type.toLowerCase() : null;
  const before = source.relations.length;

  source.relations = source.relations.filter(r => {
    if (r.targetId !== opts.target) return true;
    if (type && r.type !== type) return true;
    return false;
  });

  const removed = before - source.relations.length;
  if (removed === 0) {
    console.log(chalk.yellow('未找到匹配的关系'));
    return;
  }

  const target = entries.find(e => e.id === opts.target);
  if (target && target.relations) {
    if (type) {
      const reverseTypes = getReverseTypes(type);
      target.relations = target.relations.filter(r => {
        if (r.targetId !== opts.id) return true;
        if (!reverseTypes.includes(r.type)) return true;
        return false;
      });
    } else {
      target.relations = target.relations.filter(r => r.targetId !== opts.id);
    }
  }

  source.updatedAt = new Date().toISOString();
  if (target) target.updatedAt = new Date().toISOString();
  saveEntries(entries);

  const author = getAuthor(opts);
  appendHistory('relate-delete', [opts.id, opts.target], `删除 ${source.name} → ${target ? target.name : opts.target} 的关系`, author);

  console.log(chalk.green('✓ 关系已删除'));
}

function getReverseTypes(type) {
  if (!type) return [];
  const map = {
    predecessor: ['successor'],
    successor: ['predecessor'],
    competitor: ['competitor'],
    branch: ['forked-from'],
    'forked-from': ['branch'],
    acquired: ['acquired-by'],
    'acquired-by': ['acquired'],
  };
  return map[type] || [];
}

function checkBroken() {
  const entries = loadEntries();
  const ids = new Set(entries.map(e => e.id));
  let brokenCount = 0;

  console.log(chalk.cyan('═══ 检查断链关系 ═══'));
  console.log();

  for (const entry of entries) {
    if (!entry.relations || entry.relations.length === 0) continue;
    for (const rel of entry.relations) {
      if (!ids.has(rel.targetId)) {
        const version = entry.version ? ` v${entry.version}` : '';
        console.log(chalk.red(`  ✗ ${entry.name || '(未命名)'}${version} → ${TYPE_LABELS[rel.type] || rel.type}: ${rel.targetName || rel.targetId} (目标已不存在)`));
        brokenCount++;
      }
    }
  }

  if (brokenCount === 0) {
    console.log(chalk.green('✓ 所有关系均有效，无断链'));
    return;
  }

  console.log();
  console.log(chalk.yellow(`共 ${brokenCount} 条断链关系`));
  console.log(chalk.gray('使用 --cleanup 自动清理断链关系'));

  if (cleanupDanglingRelations_flag) {
    const cleaned = cleanupDanglingRelations(entries);
    saveEntries(entries);
    appendHistory('relate-cleanup', [], `清理 ${cleaned} 条断链关系`);
    console.log(chalk.green(`✓ 已清理 ${cleaned} 条断链关系`));
  }
}

let cleanupDanglingRelations_flag = false;

function relateMain(opts) {
  if (opts.cleanup) {
    cleanupDanglingRelations_flag = true;
  }
  relate(opts);
}

module.exports = relateMain;
