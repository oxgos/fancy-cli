# `@fancy-cli`

> Fancy-cli脚手架调试方式

## Flow

```
1.启动本地mongoDb
2.运行fancy-cli server
3.确保fancy命令已安装到全局
4.在个空文件夹，运行fancy init test-project --debug --force --targetPath /Users/gavin_guo/Desktop/study-demo/CLI/demo/fancy-cli/commands/init
PS: 确保是空文件夹，因为会涉及清空文件夹操作，不小心误删除了，文件就找不回来了
```

## 相关文件
```
脚手架目录 -> /Users/gavin_guo/.fancy-cli
init项目时，模板存放目录 -> 脚手架目录 -> /Users/gavin_guo/.fancy-cli/template
fancy-cli环境变量路径 -> /Users/gavin_guo/cli/.env
```
