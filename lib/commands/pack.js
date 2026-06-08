const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const chalk = require('chalk');
const { getStoreDir, loadMeta, isInitialized } = require('../store');

function pack(opts) {
  if (!isInitialized()) {
    console.error(chalk.red('错误: 请先运行 kyg init 初始化考古馆'));
    process.exit(1);
  }

  const storeDir = getStoreDir();
  const meta = loadMeta();
  const outputName = opts.output || `kaoguguan-${(meta.name || 'pack').replace(/\s+/g, '-')}.zip`;
  const outputPath = path.resolve(outputName);

  console.log(chalk.cyan('打包馆藏:'), storeDir);
  console.log(chalk.cyan('输出文件:'), outputPath);
  console.log();

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const size = (archive.pointer() / 1024).toFixed(1);
    console.log(chalk.green('✓ 研究包已导出'));
    console.log(chalk.gray(`  文件: ${outputPath}`));
    console.log(chalk.gray(`  大小: ${size} KB`));
    console.log();
    console.log(chalk.cyan('使用 kyg unpack 解包后可继续操作'));
  });

  archive.on('error', (err) => {
    console.error(chalk.red('打包错误:'), err.message);
    process.exit(1);
  });

  archive.on('entry', (entry) => {
    console.log(chalk.gray('  + ' + entry.name));
  });

  archive.pipe(output);
  archive.directory(storeDir, 'kaoguguan-data');
  archive.finalize();
}

module.exports = pack;
