'use strict'

const log = require('npmlog')

log.level = process.env.LOG_LEVEL || 'info'
log.heading = 'Fancy'
log.headingStyle = { fg: 'red', bg: 'black' }
log.addLevel('success', 2000, { lg: 'green', bold: true })

module.exports = log
