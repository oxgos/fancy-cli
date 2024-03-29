'use strict';
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const semver = require('semver');
const ejs = require('ejs');
const glob = require('glob');
const log = require('@fancy-cli/log');
const { spinnerStart, sleep, execAsync } = require('@fancy-cli/utils');
const Command = require('@fancy-cli/command');
const Package = require('@fancy-cli/package');

const getProjectTemplate = require('./getProjectTemplate');

const userHome = require('os').homedir();

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMAND = ['npm', 'cnpm'];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._cmd.force;
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }
  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose('projectInfo', projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
      }
      // 3. 安装模板
      await this.installTemplate();
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(e);
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error('无法识别项目模板类型');
      }
    } else {
      throw new Error('项目模板信息不存在！');
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error('命令不存在!命令: ' + command);
      }
      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }

  async ejsRender(options) {
    return new Promise((resolve, reject) => {
      const dir = process.cwd();
      glob(
        '**',
        {
          cwd: dir,
          ignore: options.ignore,
          nodir: true, // 排除文件夹
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          Promise.all(
            files.map((file) => {
              const filePath = path.resolve(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(
                  filePath,
                  this.projectInfo,
                  {},
                  (err, result) => {
                    if (err) {
                      reject1(err);
                    } else {
                      // ejs后,需要重新写入文件
                      fse.writeFileSync(filePath, result);
                      resolve1(result);
                    }
                  }
                );
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
  }

  async installNormalTemplate() {
    log.verbose('templateInfo', this.templateInfo);
    log.verbose('templateNpm', this.templateNpm);
    let spinner = spinnerStart('正在安装模板...');
    await sleep();
    try {
      // 拷贝模板代码至当前目录
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        'template'
      );
      const targetPath = process.cwd();
      // 确保相关目录存在，不存在则创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      // 拷贝
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success('模板安装成功');
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['**/node_modules/**', ...templateIgnore];
    await this.ejsRender({ ignore });
    // 依赖安装
    const { installCommand, startCommand } = this.templateInfo;
    await this.execCommand(installCommand, '依赖安装失败！');
    // 启动项目
    this.execCommand(startCommand, '启动执行命令失败！');
  }

  // 安装自定义模板
  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板');
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          'template'
        );
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        log.verbose('options', options);

        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose('code', code);
        await execAsync('node', ['-e', code], {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        log.success('自定义模板安装成功');
      }
    }
  }

  async downloadTemplate() {
    // 思路
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过egg.js搭建一套后端系统
    // 1.2 通过npm存储项目模板
    // 1.3 将项目模板信息存储到mongodb数据库中
    // 1.4 通过egg.js获取mongodb中的数据并且通过API返回
    // 1.5 通过数据库数据，用npminstall进行下载安装
    // 1.6 把下载的目录拷贝到用户所在目录
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    // 脚手架目录 -> /Users/gavin_guo/.fancy-cli
    const targetPath = path.resolve(userHome, '.fancy-cli', 'template');
    const storeDir = path.resolve(
      userHome,
      '.fancy-cli',
      'template',
      'node_modules'
    );
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart('正在下载模板');
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('下载模板成功');
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板');
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('更新模板成功');
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd(); // path.resolve('.')也可以
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 1.1 询问是否继续创建
        ifContinue = (
          await inquirer.prompt([
            {
              type: 'confirm',
              name: 'ifContinue',
              message: '当前文件夹不为空，是否继续创建项目?',
              default: false,
            },
          ])
        ).ifContinue;
        if (!ifContinue) {
          return;
        }
      }

      if (ifContinue || this.force) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: '是否确认清空当前目录下的文件?',
            default: false,
          },
        ]);
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    // 2. 是否启动强制更新
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
    return await this.getProjectInfo();
  }

  async getProjectInfo() {
    function isValidName(v) {
      return /^[a-zA-Z]+((_|-)[a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
    }
    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: '请选择初始化类型',
        default: TYPE_PROJECT,
        choices: [
          {
            name: '项目',
            value: TYPE_PROJECT,
          },
          {
            name: '组件',
            value: TYPE_COMPONENT,
          },
        ],
      },
    ]);
    log.verbose('type', type);
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );
    const title = type === TYPE_PROJECT ? '项目' : '组件';
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      validate: function (v) {
        const done = this.async();

        setTimeout(function () {
          // 1.输入的首字符必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许"—_"
          // 合法：a,a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1
          // 不合法：1, a_, a-, a_1, a-1
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`);
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };
    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      ...[
        {
          type: 'input',
          name: 'projectVersion',
          message: `请输入${title}版本号`,
          default: '1.0.0',
          validate: function (v) {
            const done = this.async();

            setTimeout(function () {
              // 非法版本号都返回null
              if (!!!semver.valid(v)) {
                done('请输入合法的版本号');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: function (v) {
            if (!!semver.valid(v)) {
              // 会将v1.0.0 -> 1.0.0
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: `请选择${title}模板`,
          choices: this.createTemplateChoice(),
        },
      ]
    );
    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        type,
        ...projectInfo,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        validate: function (v) {
          const done = this.async();

          setTimeout(function () {
            if (!v) {
              done('请输入组件描述信息');
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      // 2. 获取组件的基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        type,
        ...projectInfo,
        ...component,
      };
    }
    // 生成classname -> 用于ejs替换模板中package.json的项目名称
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require('kebab-case')(
        projectInfo.projectName
      ).replace(/^-/, '');
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤逻辑
    fileList = fileList.filter(
      (file) => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
