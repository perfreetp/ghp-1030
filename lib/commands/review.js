const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, getStoreDir, getMissingFields, REQUIRED_FIELDS, OPTIONAL_FIELDS } = require('../store');

const STATUS_COMPLETE = '✓';
const STATUS_MISSING = '✗';

function getFieldStatus(entry) {
  const status = {};
  for (const f of REQUIRED_FIELDS) {
    status[f] = entry[f] ? STATUS_COMPLETE : STATUS_MISSING;
  }
  const arrayFields = ['features', 'tags'];
  for (const f of OPTIONAL_FIELDS) {
    if (arrayFields.includes(f)) {
      status[f] = (entry[f] && entry[f].length > 0) ? STATUS_COMPLETE : STATUS_MISSING;
    } else {
      status[f] = entry[f] ? STATUS_COMPLETE : STATUS_MISSING;
    }
  }
  return status;
}

function getCompletionScore(entry) {
  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  let filled = 0;
  for (const f of REQUIRED_FIELDS) {
    if (entry[f]) filled++;
  }
  const arrayFields = ['features', 'tags'];
  for (const f of OPTIONAL_FIELDS) {
    if (arrayFields.includes(f)) {
      if (entry[f] && entry[f].length > 0) filled++;
    } else {
      if (entry[f]) filled++;
    }
  }
  return Math.round((filled / allFields.length) * 100);
}

function parseExistingChecklist(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const state = {};

  const sections = content.split(/^### /m);
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    let entryId = '';
    let currentField = '';

    const fieldHeader = sections[i - 1].match(/## 缺失字段: (.+)/);
    if (fieldHeader) {
      currentField = fieldHeader[1].trim();
    }

    for (const line of lines) {
      const idMatch = line.match(/^- ID: (.+)$/);
      if (idMatch) {
        entryId = idMatch[1].trim();
      }

      const ownerMatch = line.match(/^- 负责人: (.+)$/);
      if (ownerMatch && entryId) {
        const owner = ownerMatch[1].trim();
        if (owner && owner !== '*(未分配)*') {
          const key = `${entryId}::${currentField}`;
          if (!state[key]) state[key] = {};
          state[key].owner = owner;
        }
      }

      const noteMatch = line.match(/^- 备注: (.+)$/);
      if (noteMatch && entryId) {
        const note = noteMatch[1].trim();
        if (note && note !== '*(无)*') {
          const key = `${entryId}::${currentField}`;
          if (!state[key]) state[key] = {};
          state[key].note = note;
        }
      }
    }
  }

  return state;
}

function review(opts) {
  let entries = loadEntries();

  if (opts.company) {
    entries = entries.filter(e => e.company === opts.company);
  }
  if (opts.year) {
    entries = entries.filter(e => e.year === opts.year);
  }
  if (opts.name) {
    entries = entries.filter(e => e.name && e.name.includes(opts.name));
  }

  if (opts.missing) {
    const missingField = opts.missing.toLowerCase();
    entries = entries.filter(e => {
      const missing = getMissingFields(e);
      return missing.some(m => m.toLowerCase().startsWith(missingField));
    });
  }

  if (entries.length === 0) {
    console.log(chalk.yellow('未找到匹配的条目'));
    return;
  }

  console.log(chalk.cyan('═══ 整理状态审查 ═══'));
  const filters = [];
  if (opts.company) filters.push(`公司: ${opts.company}`);
  if (opts.year) filters.push(`年份: ${opts.year}`);
  if (opts.name) filters.push(`名称: ${opts.name}`);
  if (opts.missing) filters.push(`缺失: ${opts.missing}`);
  if (filters.length > 0) {
    console.log(chalk.gray(`筛选: ${filters.join(', ')}`));
  }
  console.log();

  const checklist = [];

  for (const e of entries) {
    const fieldStatus = getFieldStatus(e);
    const score = getCompletionScore(e);
    const version = e.version ? ` v${e.version}` : '';
    const company = e.company ? ` [${e.company}]` : '';

    let scoreColor = chalk.green;
    if (score < 50) scoreColor = chalk.red;
    else if (score < 80) scoreColor = chalk.yellow;

    console.log(chalk.white(`◆ ${e.name || '(未命名)'}${version}${company}`), scoreColor(`[${score}%]`), chalk.gray(`(${e.id})`));

    const missing = [];
    const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
    for (const f of allFields) {
      const s = fieldStatus[f];
      if (s === STATUS_MISSING) {
        missing.push(f);
        console.log(chalk.red(`    ✗ ${f}`));
      }
    }

    const filled = allFields.filter(f => fieldStatus[f] === STATUS_COMPLETE);
    if (filled.length > 0 && missing.length > 0) {
      console.log(chalk.gray(`    ✓ ${filled.join(', ')}`));
    }

    if (missing.length === 0) {
      console.log(chalk.green('    ✓ 字段完整'));
    }

    checklist.push({
      id: e.id,
      name: e.name || '(未命名)',
      version: e.version || '',
      company: e.company || '',
      year: e.year || '',
      completionScore: score,
      missingFields: missing,
    });
  }

  console.log();
  const avgScore = Math.round(checklist.reduce((s, c) => s + c.completionScore, 0) / checklist.length);
  const totalMissing = checklist.reduce((s, c) => s + c.missingFields.length, 0);
  console.log(chalk.cyan(`共 ${checklist.length} 个条目，平均完成度 ${avgScore}%，待补字段 ${totalMissing} 项`));

  if (opts.output) {
    const outputPath = path.join(getStoreDir(), opts.output);
    const prevState = parseExistingChecklist(outputPath);

    const lines = [];
    lines.push('# 待补清单');
    lines.push('');
    lines.push(`> 生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`> 条目数: ${checklist.length}`);
    lines.push(`> 待补字段总数: ${totalMissing}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const byField = new Map();
    for (const item of checklist) {
      if (item.missingFields.length === 0) continue;
      for (const field of item.missingFields) {
        if (!byField.has(field)) byField.set(field, []);
        byField.get(field).push(item);
      }
    }

    for (const [field, items] of byField) {
      lines.push(`## 缺失字段: ${field}`);
      lines.push('');
      for (const item of items) {
        const version = item.version ? ` v${item.version}` : '';
        const company = item.company ? ` [${item.company}]` : '';
        const key = `${item.id}::${field}`;
        const prev = prevState[key] || {};
        const owner = prev.owner || '';
        const note = prev.note || '';

        lines.push(`### ${item.name}${version}${company}`);
        lines.push('');
        lines.push(`- ID: ${item.id}`);
        lines.push(`- 完成度: ${item.completionScore}%`);
        lines.push(`- 负责人: ${owner || '*(未分配)*'}`);
        lines.push(`- 备注: ${note || '*(无)*'}`);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(chalk.green(`✓ 待补清单已输出: ${outputPath}`));
  }
}

module.exports = review;
