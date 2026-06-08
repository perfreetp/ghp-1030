const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const chalk = require('chalk');
const { getStoreDir, loadEntries, loadMeta, isInitialized } = require('../store');

function generateManifest(storeDir, entries, meta) {
  const screenshotsDir = path.join(storeDir, 'screenshots');
  let screenshotCount = 0;
  if (fs.existsSync(screenshotsDir)) {
    screenshotCount = fs.readdirSync(screenshotsDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'].includes(ext);
    }).length;
  }

  const reportFiles = [];
  const items = fs.readdirSync(storeDir);
  for (const item of items) {
    if (item.endsWith('.md') || item.endsWith('.txt')) {
      reportFiles.push(item);
    }
  }

  const manifest = {
    name: meta.name || '未命名馆藏',
    generatedAt: new Date().toISOString(),
    generatedBy: 'kyg (产品考古馆)',
    entryCount: entries.length,
    screenshotCount,
    reportFiles,
    fields: {
      withCompany: entries.filter(e => e.company).length,
      withYear: entries.filter(e => e.year).length,
      withFeatures: entries.filter(e => e.features && e.features.length > 0).length,
      withScreenshot: entries.filter(e => e.screenshot).length,
      withLink: entries.filter(e => e.link).length,
      withInterview: entries.filter(e => e.interview).length,
      withDispute: entries.filter(e => e.dispute).length,
      withRelations: entries.filter(e => e.relations && e.relations.length > 0).length,
    },
  };

  return manifest;
}

function pack(opts) {
  if (!isInitialized()) {
    console.error(chalk.red('错误: 请先运行 kyg init 初始化考古馆'));
    process.exit(1);
  }

  const storeDir = getStoreDir();
  const meta = loadMeta();
  const entries = loadEntries();
  const manifest = generateManifest(storeDir, entries, meta);

  fs.writeFileSync(
    path.join(storeDir, 'MANIFEST.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  console.log(chalk.green('✓ 清单文件已生成: MANIFEST.json'));

  if (opts.dir) {
    packToDir(storeDir, path.resolve(opts.dir), manifest);
  } else {
    packToZip(storeDir, meta, opts, manifest);
  }
}

function packToDir(storeDir, targetDir, manifest) {
  console.log(chalk.cyan('导出目录:'), targetDir);
  console.log();

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const dataDest = path.join(targetDir, 'kaoguguan-data');
  if (fs.existsSync(dataDest)) {
    fs.rmSync(dataDest, { recursive: true, force: true });
  }

  copyDirRecursive(storeDir, dataDest);

  console.log(chalk.green('✓ 研究包已导出到目录'));
  console.log(chalk.gray(`  目录: ${targetDir}`));
  console.log(chalk.gray(`  条目: ${manifest.entryCount}`));
  console.log(chalk.gray(`  截图: ${manifest.screenshotCount}`));
  console.log();
  console.log(chalk.cyan('使用 kyg unpack --dir <目录路径> 导入'));
}

function packToZip(storeDir, meta, opts, manifest) {
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
    console.log(chalk.gray(`  条目: ${manifest.entryCount}`));
    console.log(chalk.gray(`  截图: ${manifest.screenshotCount}`));
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

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = pack;
