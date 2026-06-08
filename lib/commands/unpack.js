const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { STORE_DIR, getStoreDir, isInitialized } = require('../store');

function unpack(opts) {
  const sourcePath = opts.dir ? path.resolve(opts.dir) : (opts.file ? path.resolve(opts.file) : null);

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error(chalk.red('错误: 请指定有效的来源 (--file zip文件 或 --dir 目录)'));
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

  const stat = fs.statSync(sourcePath);

  if (stat.isFile() && path.extname(sourcePath).toLowerCase() === '.zip') {
    unpackFromZip(sourcePath, targetDir);
  } else if (stat.isDirectory()) {
    unpackFromDir(sourcePath, targetDir);
  } else {
    console.error(chalk.red('错误: 不支持的来源格式，请使用 .zip 文件或目录'));
    process.exit(1);
  }
}

function unpackFromZip(zipPath, targetDir) {
  console.log(chalk.cyan('解包研究包(zip):'), zipPath);
  console.log(chalk.cyan('目标目录:'), targetDir);
  console.log();

  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);

  const zipEntries = zip.getEntries();
  let hasData = false;
  let hasScreenshots = false;
  let hasManifest = false;

  for (const entry of zipEntries) {
    const name = entry.entryName;
    if (name.includes('entries.json') || name.includes('meta.json')) hasData = true;
    if (name.includes('screenshots/')) hasScreenshots = true;
    if (name.includes('MANIFEST.json')) hasManifest = true;
  }

  if (!hasData) {
    console.error(chalk.red('错误: zip 文件中未找到有效的考古馆数据'));
    process.exit(1);
  }

  zip.extractAllTo(path.dirname(targetDir), true);

  console.log(chalk.green('✓ 研究包已解包'));
  if (hasData) console.log(chalk.gray('  数据文件: 已恢复'));
  if (hasScreenshots) console.log(chalk.gray('  截图文件: 已恢复'));

  if (hasManifest) {
    printManifest(path.join(targetDir, 'MANIFEST.json'));
  }

  console.log();
  console.log(chalk.cyan('现在可以使用 kyg report、kyg scan、kyg compare 等命令继续操作'));
}

function unpackFromDir(sourceDir, targetDir) {
  let dataDir = sourceDir;

  const possibleSubDir = path.join(sourceDir, 'kaoguguan-data');
  if (fs.existsSync(possibleSubDir) && fs.existsSync(path.join(possibleSubDir, 'entries.json'))) {
    dataDir = possibleSubDir;
  }

  if (!fs.existsSync(path.join(dataDir, 'entries.json'))) {
    console.error(chalk.red('错误: 目录中未找到有效的考古馆数据 (entries.json)'));
    process.exit(1);
  }

  console.log(chalk.cyan('导入目录:'), dataDir);
  console.log(chalk.cyan('目标目录:'), targetDir);
  console.log();

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  copyDirRecursive(dataDir, targetDir);

  const hasScreenshots = fs.existsSync(path.join(targetDir, 'screenshots'));
  const hasManifest = fs.existsSync(path.join(targetDir, 'MANIFEST.json'));

  console.log(chalk.green('✓ 研究包已从目录导入'));
  console.log(chalk.gray('  数据文件: 已恢复'));
  if (hasScreenshots) console.log(chalk.gray('  截图文件: 已恢复'));

  if (hasManifest) {
    printManifest(path.join(targetDir, 'MANIFEST.json'));
  }

  console.log();
  console.log(chalk.cyan('现在可以使用 kyg report、kyg scan、kyg compare 等命令继续操作'));
}

function printManifest(manifestPath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log();
    console.log(chalk.cyan('═══ 研究包说明 ═══'));
    console.log(chalk.gray(`  馆藏名称: ${manifest.name || '未知'}`));
    console.log(chalk.gray(`  生成时间: ${manifest.generatedAt || '未知'}`));
    console.log(chalk.gray(`  条目数: ${manifest.entryCount || 0}`));
    console.log(chalk.gray(`  截图数: ${manifest.screenshotCount || 0}`));
    if (manifest.reportFiles && manifest.reportFiles.length > 0) {
      console.log(chalk.gray(`  报告文件: ${manifest.reportFiles.join(', ')}`));
    }
    if (manifest.fields) {
      const f = manifest.fields;
      console.log(chalk.gray(`  含公司: ${f.withCompany}/${manifest.entryCount}`));
      console.log(chalk.gray(`  含年份: ${f.withYear}/${manifest.entryCount}`));
      console.log(chalk.gray(`  含功能: ${f.withFeatures}/${manifest.entryCount}`));
      console.log(chalk.gray(`  含关系: ${f.withRelations || 0}/${manifest.entryCount}`));
    }
  } catch (e) {
    // ignore
  }
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

module.exports = unpack;
