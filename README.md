# spaBootstrap

> 用一个固定的HTML文件启动angular应用，解除因为前端修改而引起的后端重新部署问题
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

# 更新第一个版本的 index 文件
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
_(Nothing yet)_

## License
Copyright (c) 2014 Zhonglei Qiu. Licensed under the MIT license.
