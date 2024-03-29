'use strict';

module.exports = core;

const path = require('path');
const commander = require('commander');
const semver = require('semver');
const colors = require('colors/safe');
const log = require('@fancy-cli/log');
const exec = require('@fancy-cli/exec');
const { getSemverVersion } = require('@fancy-cli/get-npm-info');
// 获取用户目录
const userHome = require('os').homedir();
const pathExists = require('path-exists').sync;
const pkg = require('../package.json');
const constant = require('./const');

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommander();
  } catch (e) {
    log.error(e.message);
    if (program.debug) {
      console.log(e);
    }
  }
}

async function prepare() {
  checkVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

function registerCommander() {
  program
    .version(pkg.version)
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .option('-d, --debug', '是否开启调试模式', false) // 第三参数默认值
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec);

  // 开启debug模式
  program.on('option:debug', function () {
    if (program.debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
    log.verbose('test');
  });

  program.on('option:targetPath', function () {
    if (program.targetPath) {
      process.env.CLI_TARGET_PATH = program.targetPath;
    }
  });

  // 监听未知命令
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red(`未知命令: ${obj[0]}`));
    if (availableCommands.length > 0) {
      console.log(colors.red(`可用命令: ${availableCommands.join(',')}`));
    }
  });

  program.parse(process.argv);
}

async function checkGlobalUpdate() {
  // 1.获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2.调用npm API，获取所有版本号
  const lastVersion = await getSemverVersion(currentVersion, npmName);
  log.verbose('newVersion : ', lastVersion);
  // 最新版本大于当前版本
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`更新提示: 请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本: ${lastVersion}
           更新命令: npm install -g ${npmName}`)
    );
  }
}

function checkEnv() {
  const dotenv = require('dotenv');
  // 环境变量路径 -> /Users/gavin_guo/cli/.env
  const envPath = path.resolve(userHome, 'cli', '.env');
  if (pathExists(envPath)) {
    dotenv.config({
      path: envPath,
    });
  }
  createDefaultConfig();
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME_PATH) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME_PATH);
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME_PATH);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检测用户主目录
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存'));
  }
}

// 检测权限
function checkRoot() {
  const checkRoot = require('root-check');
  // 用于降级，降成501
  checkRoot();
  /**
   * macos: 501代表普通用户权限，0表示root权限
   */
  // console.log(process.getuid())
}

// 检测cli版本
function checkVersion() {
  log.notice('cli', pkg.version);
}
