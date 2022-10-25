'use strict'

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null
  }
  const registryUrl = registry ? registry : getDefaultRegistry()
  // 拼接请求url
  const npmInfoUlr = urlJoin(registryUrl, npmName)
  return axios
    .get(npmInfoUlr)
    .then((res) => {
      if (res.status === 200) {
        return res.data
      }
      return null
    })
    .catch((err) => {
      return Promise.reject(err)
    })
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? 'https://registry.npmjs.org'
    : 'https://registry.npm.taobao.org'
}

// 从npm获取版本信息
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}

// 获取比当前版本大的版本数组
function getSemverVersions(baseVersion, versions) {
  // 版本满足某个及以上版本(^1.0.0)，再进行倒序排序，方便获取第一个为最新版本
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.gt(b, a))
}

// 获取最新版本
async function getSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const newVersions = getSemverVersions(baseVersion, versions)
  if (newVersions && newVersions.length > 0) {
    return newVersions[0]
  }
  return null
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getSemverVersion
}
