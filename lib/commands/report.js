const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadEntries, getStoreDir } = require('../store');

function report(opts) {
  const entries = loadEntries();

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

  generateMarkdown(entries, opts.output);
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

function generateMarkdown(entries, outputName) {
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
  md += `> 条目总数: ${entries.length}\n\n`;

  md += '---\n\n';
  md += '## 目录\n\n';
  for (const e of sorted) {
    const version = e.version ? ` v${e.version}` : '';
    const anchor = (e.name || 'unknown').toLowerCase().replace(/\s+/g, '-');
    md += `- [${e.name || '(未命名)'}${version}](#${anchor})\n`;
  }
  md += '\n---\n\n';

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
    if (e.tags && e.tags.length > 0) md += `\n*标签: ${e.tags.join(', ')}*\n\n`;
    md += '---\n\n';
  }

  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(chalk.green('✓ 报告已生成:'), outputPath);
}

module.exports = report;
