'use strict'

const log = require('npmlog')

log.level = process.env.LOG_LEVEL || 'info' // 判断debug模式
log.heading = 'Fancy' // 修改前缀
log.headingStyle = { fg: 'red', bg: 'black' }
log.addLevel('success', 2000, { lg: 'green', bold: true }) // 添加自定义命令

module.exports = log
