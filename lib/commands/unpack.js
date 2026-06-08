const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { STORE_DIR, getStoreDir, isInitialized } = require('../store');

function unpack(opts) {
  const zipPath = opts.file ? path.resolve(opts.file) : null;

  if (!zipPath || !fs.existsSync(zipPath)) {
    console.error(chalk.red('错误: 请指定有效的 zip 文件 (--file)'));
    process.exit(1);
  }

  if (path.extname(zipPath).toLowerCase() !== '.zip') {
    console.error(chalk.red('错误: 仅支持 .zip 文件'));
    process.exit(1);
  }

  const targetDir = getStoreDir();
  if (isInitialized()) {
    console.log(chalk.yellow('⚠ 当前目录已存在考古馆数据'));
    if (!opts.force) {
      console.log(chalk.yellow('  如需覆盖，请加 --force 参数'));
      return;
    }
    console.log(chalk.yellow('  --force 已指定，将覆盖现有数据'));
  }

  console.log(chalk.cyan('解包研究包:'), zipPath);
  console.log(chalk.cyan('目标目录:'), targetDir);
  console.log();

  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);

  const entries = zip.getEntries();
  let hasData = false;
  let hasScreenshots = false;

  for (const entry of entries) {
    const name = entry.entryName;
    if (name.includes('entries.json') || name.includes('meta.json')) hasData = true;
    if (name.includes('screenshots/')) hasScreenshots = true;
  }

  if (!hasData) {
    console.error(chalk.red('错误: zip 文件中未找到有效的考古馆数据'));
    process.exit(1);
  }

  zip.extractAllTo(path.dirname(targetDir), true);

  console.log(chalk.green('✓ 研究包已解包'));
  if (hasData) console.log(chalk.gray('  数据文件: 已恢复'));
  if (hasScreenshots) console.log(chalk.gray('  截图文件: 已恢复'));
  console.log();
  console.log(chalk.cyan('现在可以使用 kyg report、kyg scan、kyg compare 等命令继续操作'));
}

module.exports = unpack;
