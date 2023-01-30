const request = require('@fancy-cli/request');

module.exports = function () {
  return request({
    url: '/project/template',
  });
};
