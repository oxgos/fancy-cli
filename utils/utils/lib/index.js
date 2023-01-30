'use strict';

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

function spinnerStart(msg, spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner(msg + '.. %s');
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
};
