const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, getStoreDir } = require('../store');

function report(opts) {
  let entries = loadEntries();

  if (opts.keyword) {
    searchKeyword(entries, opts.keyword);
    return;
  }

  if (opts.images) {
    exportImages(entries);
    return;
  }

  if (opts.duplicates) {
    checkDuplicates(entries);
    return;
  }

  if (opts.stats) {
    printStats(entries);
    return;
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

  generateMarkdown(entries, opts.output, opts);
}

function searchKeyword(entries, keyword) {
  const kw = keyword.toLowerCase();
  const results = entries.filter(e => {
    const searchable = [
      e.name, e.version, e.company, e.year,
      e.description, e.link, e.interview, e.dispute,
      ...(e.features || []), ...(e.tags || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(kw);
  });

  if (results.length === 0) {
    console.log(chalk.yellow(`未找到包含 "${keyword}" 的条目`));
    return;
  }

  console.log(chalk.cyan(`找到 ${results.length} 个匹配条目:`));
  for (const e of results) {
    const version = e.version ? ` v${e.version}` : '';
    const company = e.company ? ` [${e.company}]` : '';
    console.log(chalk.white(`  ◆ ${e.name || '(未命名)'}${version}${company}`), chalk.gray(`(${e.id})`));
  }
}

function exportImages(entries) {
  const images = entries.filter(e => e.screenshot);
  if (images.length === 0) {
    console.log(chalk.yellow('没有包含截图的条目'));
    return;
  }

  const outputPath = path.join(getStoreDir(), 'images-list.txt');
  const lines = images.map(e => {
    const parts = [e.screenshot, e.name || '(未命名)'];
    if (e.company) parts.push(e.company);
    if (e.year) parts.push(e.year);
    return parts.join(' | ');
  });

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(chalk.green(`✓ 图片清单已导出: ${images.length} 条`));
  console.log(chalk.gray('  文件:'), outputPath);
}

function checkDuplicates(entries) {
  const seen = new Map();
  const duplicates = [];

  for (const e of entries) {
    const key = `${(e.name || '').toLowerCase()}|${(e.version || '').toLowerCase()}|${(e.company || '').toLowerCase()}`;
    if (seen.has(key)) {
      duplicates.push([seen.get(key), e]);
    } else {
      seen.set(key, e);
    }
  }

  if (duplicates.length === 0) {
    console.log(chalk.green('✓ 未发现重复条目'));
    return;
  }

  console.log(chalk.yellow(`⚠ 发现 ${duplicates.length} 组重复条目:`));
  for (const [a, b] of duplicates) {
    console.log(chalk.white(`  ◆ ${a.name || '(未命名)'} v${a.version || '?'} [${a.company || '?'}]`));
    console.log(chalk.gray(`    ID 1: ${a.id}`));
    console.log(chalk.gray(`    ID 2: ${b.id}`));
  }
}

function printStats(entries) {
  console.log(chalk.cyan('═══ 馆藏统计 ═══'));
  console.log();
  console.log(chalk.white('  总条目数:'), entries.length);

  const companies = new Map();
  const years = new Map();
  let withScreenshot = 0;
  let withFeatures = 0;
  let withDispute = 0;
  let withInterview = 0;
  let withLink = 0;

  for (const e of entries) {
    if (e.company) companies.set(e.company, (companies.get(e.company) || 0) + 1);
    if (e.year) years.set(e.year, (years.get(e.year) || 0) + 1);
    if (e.screenshot) withScreenshot++;
    if (e.features && e.features.length > 0) withFeatures++;
    if (e.dispute) withDispute++;
    if (e.interview) withInterview++;
    if (e.link) withLink++;
  }

  console.log(chalk.white('  含截图:'), withScreenshot);
  console.log(chalk.white('  含功能列表:'), withFeatures);
  console.log(chalk.white('  含争议点:'), withDispute);
  console.log(chalk.white('  含访谈:'), withInterview);
  console.log(chalk.white('  含参考链接:'), withLink);

  if (companies.size > 0) {
    console.log();
    console.log(chalk.cyan('  按公司:'));
    for (const [c, n] of [...companies.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(chalk.gray(`    ${c}: ${n}`));
    }
  }

  if (years.size > 0) {
    console.log();
    console.log(chalk.cyan('  按年份:'));
    for (const [y, n] of [...years.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(chalk.gray(`    ${y}: ${n}`));
    }
  }
}

function generateMarkdown(entries, outputName, opts) {
  const storeDir = getStoreDir();
  const outputPath = path.join(storeDir, outputName);

  const sorted = [...entries].sort((a, b) => {
    const ya = parseInt(a.year) || 9999;
    const yb = parseInt(b.year) || 9999;
    if (ya !== yb) return ya - yb;
    return (a.name || '').localeCompare(b.name || '');
  });

  let md = '# 产品考古报告\n\n';
  md += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  md += `> 条目总数: ${entries.length}\n`;

  const filters = [];
  if (opts.company) filters.push(`公司: ${opts.company}`);
  if (opts.year) filters.push(`年份: ${opts.year}`);
  if (opts.name) filters.push(`产品名: ${opts.name}`);
  if (filters.length > 0) {
    md += `> 筛选条件: ${filters.join(', ')}\n`;
  }
  md += '\n---\n\n';

  md += '## 目录\n\n';
  for (const e of sorted) {
    const version = e.version ? ` v${e.version}` : '';
    const anchor = (e.name || 'unknown').toLowerCase().replace(/\s+/g, '-');
    md += `- [${e.name || '(未命名)'}${version}](#${anchor})\n`;
  }
  md += '\n---\n\n';

  md += generateFeatureChangeSummary(sorted);
  md += generateRelationSummary(sorted);
  md += generateDisputeSummary(sorted);
  md += generateInterviewSummary(sorted);
  md += generateLinkIndex(sorted);

  let currentYear = null;
  for (const e of sorted) {
    const year = e.year || '未知年份';
    if (year !== currentYear) {
      currentYear = year;
      md += `## ${year}\n\n`;
    }

    const version = e.version ? ` v${e.version}` : '';
    md += `### ${e.name || '(未命名)'}${version}\n\n`;
    md += `- **ID**: ${e.id}\n`;
    if (e.company) md += `- **公司**: ${e.company}\n`;
    if (e.year) md += `- **年份**: ${e.year}\n`;
    if (e.screenshot) md += `- **截图**: ${e.screenshot}\n`;
    if (e.link) md += `- **参考链接**: ${e.link}\n`;
    if (e.description) md += `\n${e.description}\n`;
    if (e.features && e.features.length > 0) {
      md += `\n**功能:**\n`;
      e.features.forEach(f => { md += `- ${f}\n`; });
      md += '\n';
    }
    if (e.interview) md += `\n> **访谈摘要**: ${e.interview}\n\n`;
    if (e.dispute) md += `\n> ⚠️ **争议点**: ${e.dispute}\n\n`;
    if (e.relations && e.relations.length > 0) {
      md += `\n**关系:**\n`;
      const TYPE_LABELS_MD = {
        predecessor: '前身', competitor: '竞品', branch: '分支版本',
        acquired: '收购改名', successor: '后续产品', 'forked-from': '衍生出',
        'acquired-by': '被收购方',
      };
      for (const rel of e.relations) {
        const label = TYPE_LABELS_MD[rel.type] || rel.type;
        md += `- ${label}: ${rel.targetName || rel.targetId}\n`;
      }
      md += '\n';
    }
    if (e.tags && e.tags.length > 0) md += `\n*标签: ${e.tags.join(', ')}*\n\n`;
    md += '---\n\n';
  }

  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(chalk.green('✓ 报告已生成:'), outputPath);
  if (filters.length > 0) {
    console.log(chalk.gray(`  筛选: ${filters.join(', ')}`));
  }
  console.log(chalk.gray(`  条目: ${entries.length}`));
}

function generateFeatureChangeSummary(entries) {
  const byName = new Map();
  for (const e of entries) {
    const key = (e.name || '').toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(e);
  }

  const multiVersion = [...byName.entries()].filter(([, v]) => v.length > 1);
  if (multiVersion.length === 0) return '';

  let md = '## 功能变化摘要\n\n';
  for (const [name, versions] of multiVersion) {
    const sorted = [...versions].sort((a, b) => {
      const ya = parseInt(a.year) || 9999;
      const yb = parseInt(b.year) || 9999;
      return ya - yb;
    });

    md += `### ${name}\n\n`;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevVer = prev.version || '?';
      const currVer = curr.version || '?';

      const prevSet = new Set(prev.features || []);
      const currSet = new Set(curr.features || []);
      const added = [...currSet].filter(f => !prevSet.has(f));
      const removed = [...prevSet].filter(f => !currSet.has(f));

      md += `**v${prevVer} → v${currVer}**`;
      if (curr.year) md += ` (${curr.year})`;
      md += '\n';

      if (added.length > 0) {
        md += `- 新增: ${added.join(', ')}\n`;
      }
      if (removed.length > 0) {
        md += `- 移除: ${removed.join(', ')}\n`;
      }
      if (added.length === 0 && removed.length === 0) {
        md += '- 无功能变化\n';
      }
      md += '\n';
    }
  }

  md += '---\n\n';
  return md;
}

function generateRelationSummary(entries) {
  const withRelations = entries.filter(e => e.relations && e.relations.length > 0);
  if (withRelations.length === 0) return '';

  const TYPE_LABELS = {
    predecessor: '前身', competitor: '竞品', branch: '分支版本',
    acquired: '收购改名', successor: '后续产品', 'forked-from': '衍生出',
    'acquired-by': '被收购方',
  };

  let md = '## 产品关系脉络\n\n';
  for (const e of withRelations) {
    const version = e.version ? ` v${e.version}` : '';
    md += `**${e.name || '(未命名)'}${version}**\n`;
    for (const rel of e.relations) {
      const label = TYPE_LABELS[rel.type] || rel.type;
      md += `  - ${label}: ${rel.targetName || rel.targetId}\n`;
    }
    md += '\n';
  }
  md += '---\n\n';
  return md;
}

function generateDisputeSummary(entries) {
  const withDispute = entries.filter(e => e.dispute);
  if (withDispute.length === 0) return '';

  let md = '## 争议点汇总\n\n';
  for (const e of withDispute) {
    const version = e.version ? ` v${e.version}` : '';
    md += `- **${e.name || '(未命名)'}${version}**: ${e.dispute}\n`;
  }
  md += '\n---\n\n';
  return md;
}

function generateInterviewSummary(entries) {
  const withInterview = entries.filter(e => e.interview);
  if (withInterview.length === 0) return '';

  let md = '## 访谈摘要汇总\n\n';
  for (const e of withInterview) {
    const version = e.version ? ` v${e.version}` : '';
    md += `### ${e.name || '(未命名)'}${version}\n\n`;
    md += `> ${e.interview}\n\n`;
  }
  md += '---\n\n';
  return md;
}

function generateLinkIndex(entries) {
  const withLink = entries.filter(e => e.link);
  if (withLink.length === 0) return '';

  let md = '## 参考链接索引\n\n';
  for (const e of withLink) {
    const version = e.version ? ` v${e.version}` : '';
    const company = e.company ? ` [${e.company}]` : '';
    md += `- [${e.name || '(未命名)'}${version}${company}](${e.link})\n`;
  }
  md += '\n---\n\n';
  return md;
}

module.exports = report;
