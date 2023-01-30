'use strict';

const cp = require('child_process');
const path = require('path');
const Package = require('@fancy-cli/package');
const log = require('@fancy-cli/log');

const SETTINGS = {
  init: '@fancy-cli/init',
};

const CACHE_DIR = 'dependencies';

async function exec() {
  // 1. targetPath -> modulePath
  // 2. modulePath -> Package(npm模块)
  // 3. Package.getRootFile(获取入口文件)
  // 4. Package.update / Package.install
  let storeDir = '';
  let pkg;
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose('targetPath', targetPath);
  log.verbose('homePath', homePath);
  // argument -> ['0']: projectName, ['1']: CommandObject
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      // 在当前进程中调用
      // 将arguments类数组转换为参数列表
      // require(rootFile).call(null, Array.from(arguments));
      // 在node子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        // 排除原型链上的属性和一些没用属性
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith('_') &&
          key !== 'parent'
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      // NOTE 动态入模板代码
      /**
       * 例如:
       * require('/Users/gavin_guo/Desktop/study-demo/CLI/demo/fancy-cli/commands/init/lib/index.js').call(null, ["project-test",{"commands":[],"options":[{"flags":"-f, --force","required":false,"optional":false,"variadic":false,"mandatory":false,"short":"-f","long":"--force","negate":false,"description":"是否强制初始化项目"}],"rawArgs":null,"force":true,"args":["project-test"]}])
       */
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // 执行这样的命令node -e 'console.log(1)' , (ps: -e后面为执行的javascript代码)
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      child.on('error', (e) => {
        log.error(e.message);
        process.exit(1);
      });
      child.on('exit', (e) => {
        log.verbose('命令执行成功:' + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

function spawn(command, args, options) {
  const win32 = process.platform === 'win32';
  // window执行的命令格式为: cp.spawn('cmd', ['/c', 'node', '-e', code])
  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = exec;
