#!/usr/bin/env node
'use strict'
const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用fancy-cli本地版本')
} else {
  require('../lib')(process.argv.slice(2))
}
