'use strict';

const path = require('path');

module.exports = function formatPath(p) {
  if (p && typeof p === 'string') {
    const sep = path.sep;
    // macOS会是'/'， window会是'\'，所以统一替换为'/'
    if (sep === '/') {
      return p;
    } else {
      return p.replace(/\\/g, '/');
    }
  }
  return p;
};
