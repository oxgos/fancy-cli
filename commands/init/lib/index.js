'use strict';

function init(projectName, cmdObj) {
  console.log(projectName);
  //   console.log(cmdObj.parent.targetPath);
  console.log(cmdObj.force);
  console.log(process.env.CLI_TARGET_PATH);
}

module.exports = init;
