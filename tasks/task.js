/*
 * spaBootstrap
 * 
 *
 * Copyright (c) 2014 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

var Bootstrap = require('./lib/bootstrap'),
  fs = require('fs'),
  path = require('path');



module.exports = function (grunt) {

  function getDeployAssetIndexPage(filepath) {
    if (!fs.existsSync(filepath)) {
      return false;
    }

    var assetMap = grunt.file.readJSON(filepath),
      files = [];
    if (assetMap) {
      Object.keys(assetMap).forEach(function(file) {
        var relativeFile = file.replace(process.cwd(), '').substr(1);
        var baseFile = path.basename(relativeFile);

        if (baseFile === 'index.html' || baseFile === 'index.htm') {
          files.push({local: file, remote: assetMap[file]});
        }
      });
    }

    if (files.length > 1) {
      files = files.sort(function(a, b) {
        return a.local.length - b.local.length; // 文件路径越短就越有可能是 index 页面
      });
    }

    return files.length ? files[0].remote : false;
  }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('spaBootstrap', '用一个固定的HTML文件启动单页面应用，解除因为前端修改而引起的后端重新部署问题', function () {


    var done = this.async();

    var opts = this.options({
      api: null,
      index: null,
      version: null,
      app: null,
      bootstrap: null,
      bootstrapJs: 'http://design-res.qiniudn.com/bootstrap.js'
    }), method, args = this.args, ver;


    if (typeof opts.api === 'function') {
      Bootstrap.api = opts.api;
    }
    if (opts.bootstrapJs) {
      Bootstrap.bootstrapJs = opts.bootstrapJs;
    }
    if (typeof opts.bootstrap === 'string') {
      Bootstrap.file = function(content) {
        grunt.file.write(opts.bootstrap, content);
      }
    }

    opts.app = opts.app || this.target;
    opts.index = opts.index || getDeployAssetIndexPage(grunt.config.get('deployAsset.options.assetMapJsonFile'));



    if (!opts.index || !/\.htm[l]?\b/.test(opts.index)) {
      grunt.log.error('Can not find index page');
      done();
    }


    method = args.shift() || 'insert';

    ver = args[0];
    if (/^\d+$/.test(ver)) {
      ver = parseInt(args.shift());
    } else {
      ver = opts.version || 0;
    }
    opts.version = ver;


    var meta = {app: opts.app, index: opts.index, version: ver};
    var bsError = function(e) { console.error(e); done(false);},
      bsDone = function(data) { console.log(data); done(); };

    switch (method) {
      case 'insert':
        Bootstrap.insertMeta(meta).then(bsDone, bsError);
        break;
      case 'delete':
        Bootstrap.deleteMeta(opts.app, ver).then(bsDone, bsError);
        break;
      case 'update':
        if (!opts.version) {
          grunt.log.error('You should specify version number if you wang update');
          done();
        }
        Bootstrap.updateMeta(meta).then(bsDone, bsError);
        break;
      default :
        grunt.log.error('not support method');
    }


  });

};
