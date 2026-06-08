const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { STORE_DIR, getStoreDir } = require('../store');

function init(opts) {
  const storeDir = getStoreDir();
  if (fs.existsSync(storeDir)) {
    console.log(chalk.yellow('⚠ 考古馆已存在:'), storeDir);
    return;
  }

  fs.mkdirSync(storeDir, { recursive: true });
  fs.mkdirSync(path.join(storeDir, 'screenshots'), { recursive: true });

  const meta = {
    name: opts.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(storeDir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(storeDir, 'entries.json'),
    JSON.stringify([], null, 2),
    'utf-8'
  );

  console.log(chalk.green('✓ 考古馆已创建:'), storeDir);
  console.log(chalk.gray('  馆藏名称:'), opts.name);
  console.log(chalk.gray('  数据目录:'), STORE_DIR + '/');
  console.log(chalk.gray('  截图目录:'), STORE_DIR + '/screenshots/');
  console.log();
  console.log(chalk.cyan('下一步: 使用 kyg add 添加产品条目'));
}

module.exports = init;
