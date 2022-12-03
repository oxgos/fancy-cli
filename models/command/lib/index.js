'use strict';
const log = require('@fancy-cli/log');
const semver = require('semver');
const colors = require('colors/safe');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(argv) {
    // log.verbose('Command constructor : ', argv);
    if (!argv) {
      throw new Error('入参不能为空');
    }
    if (!Array.isArray(argv)) {
      throw new Error('入参必须为数组');
    }
    if (argv.length < 1) {
      throw new Error('入参不能为空');
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      // PS: chain要重新赋值
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch((e) => {
        log.error(e.message);
      });
    });
  }
  // 初始化argv
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  // 检测node版本
  checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`node版本过低,至少需要${lowestVersion}版本以上`)
      );
    }
  }

  init() {
    throw new Error('init必须实现');
  }
  exec() {
    throw new Error('exec必须实现');
  }
}

module.exports = Command;
