# spaBootstrap

> 1. 用一个固定的HTML文件启动angular应用，解除因为前端修改而引起的后端重新部署的问题
> 2. 自动用 localStorage 缓存所有的 CSS/JS 资源，第一次加载完后每次都能迅速打开
> 3. 支持自动更新，有新版本发布后，首页自动弹出更新提醒，一键更新到最新版本
> 4. 多版本切换，在首页URL后面加上参数 `version=xx`，可以访问到之前发布的任意版本

> 最好配合 [grunt-deploy-asset](https://github.com/qiu8310/grunt-deploy-asset) 一起使用

## Getting Started

```shell
npm install grunt-spa-bootstrap --save-dev
```

```js
grunt.loadNpmTasks('grunt-spa-bootstrap');
```

## The "spaBootstrap" task

### Overview
In your project's Gruntfile, add a section named `spaBootstrap` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  spaBootstrap: {
    options: {
      index: null,
      app: 'appName',
      token: '...',
      version: 0,
      bootstrap: 'dist/bootstrap.html'
    },
    your_target: {
      // 这里设置成空就行了，此命令不会使用任何本地文件
    },
  },
})
```

### 支持的命令
```shell
# 插入一个最新的版本
grunt spaBootstrap
grunt spaBootstrap:you_target:insert

# 更新第一个版本的 meta 信息
grunt spaBootstrap:you_target:update:1  
```

### Options

#### options.api
Type: `Function`

Default value: `null`

设置成你自己的 api 接口，原程序是这样的
```js
// method 可以是 'insert', 'update', 'delete'
function api(method) {
  return 'http://mora.com/spa-bootstrap.php?m=' + method;
}
```

#### options.app
Type: `int`

Default value: `[当前 grunt 命令的 target]`

主要用来区别其它的应用的配置，以免冲突

#### options.token
Type: `string`

Default value: `null`

任意一个 app 必须对应于一个 token，token 可以在网站 (http://sinaapp.mora.com/spa-bootstrap-manager.php)[http://sinaapp.mora.com/spa-bootstrap-manager.php] 管理

一个 token 可以添加多个 app，请保管好你的 token，不能漏洞

#### options.version
Type: `int`

Default value: `0`

指定要操作的版本号，insert 时可以不指定，默认会在原来的基础上加 1

#### options.index
Type: `String`

Default value: `null`

单页面应用的起始页，如果是 angular，就是那个根目录下的 index.html（一般也是这个文件），__不过注意，这里要提供一个线上的可以访问到的 url__

如果有使用 [`grunt-deploy-asset`](https://github.com/qiu8310/grunt-deploy-asset)，只要配置好 `assetMapJsonFile` 参数，则此插件会自动通过 `assetMapJsonFile` 所指定的文件获取线上的 index url，因此也就不用配置此插件的 index 配置


#### options.bootstrap
Type: `String` 

Default value: `null`

指定生成的 bootstrap 文件存放的路径

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

* 2015-01-30         图片支持的格式中添加了 SVG 格式，在 CSS 中如果有 SVG 也会检查到（没有更新 NPM）
* 2014-12-19 0.0.2   在生成的 bootstrap.html 中指定 utf8 编码

## License
Copyright (c) 2014 Zhonglei Qiu. Licensed under the MIT license.
