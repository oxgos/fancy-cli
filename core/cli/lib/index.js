'use strict'

module.exports = core

const semver = require('semver')
const colors = require('colors/safe')
const log = require('@fancy-cli/log')
const pkg = require('../package.json')
const constant = require('./const')

function core() {
  try {
    checkVersion()
    checkNodeVersion()
  } catch (e) {
    log.error(e.message)
  }
}

function checkVersion() {
  log.notice('cli', pkg.version)
}

function checkNodeVersion() {
  const currentVersion = process.version
  const lowestVersion = constant.LOWEST_NODE_VERSION
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`node版本过低,至少需要${lowestVersion}版本以上`))
  }
}
