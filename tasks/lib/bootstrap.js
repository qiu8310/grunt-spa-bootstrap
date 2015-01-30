/*
 *
 * https://github.com/qiu8310/spa-bootstrap
 *
 * Copyright (c) 2014 Zhongelei Qiu
 * Licensed under the MIT license.
 */

'use strict';

var request = require('request'),
  path = require('path'),
  fs = require('fs'),
  Q = require('q');

var reScript = /<script(?:\s[^>]*)?\ssrc=([\'"])(.*?)\1[^>]*>[^<]*<\/script>/g,
  reStyle = /<link(?:\s[^>]*)?\shref=([\'"])(.*?)\1[^>]*>/g;

function post(path, meta) {
  var deferred = Q.defer();
  console.log('Request: ' + path, '\n\rData: ');
  Object.keys(meta).forEach(function(key) {
    var val = meta[key]; console.log('\t' + key + ' => ' + (val.length > 50 ? val.substr(0, 50) + '...' : val));
  });
  console.log();

  request.post(path, {form: meta}, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else {
      try {
        deferred.resolve(JSON.parse(body.trim()));
      } catch (e) {
        console.log('Body: ' + body);
        e.message = 'parse response body to json error';
        deferred.reject(e);
      }
    }
  });
  return deferred.promise;
}


var Bootstrap = {
  // overwrite by grunt option
  api: function(method) {
    return 'http://mora.sinaapp.com/spa-bootstrap.php?m=' + method;
  },

  // overwrite by grunt
  file: function(content) {},

  // overwrite by grout option bootstrapJs
  bootstrapJs: 'http://design-res.qiniudn.com/bootstrap.min.js',


  insertMeta: function(meta) {
    var self = this;
    return parseIndexPage(meta.index).then(function(data) {
      meta.data = JSON.stringify(data.data);
      return post(self.api('insert'), meta).then(function(rtn) {
        self.file(generateBootstrapContent(meta, data.html, data.data));
        return rtn;
      });
    });
    //return post(this.api('insert'), meta);
  },
  deleteMeta: function(app, version) {
    // 比较危险的操作，后台禁用了
    return post(this.api('delete'), {app: app, version: version});
  },
  updateMeta: function(meta) {
    var self = this;
    return parseIndexPage(meta.index).then(function(data) {
      meta.data = JSON.stringify(data.data);
      return post(self.api('update'), meta);
    });
    //return post(this.api('update'), meta);
  },

  parseIndexPage: parseIndexPage
};

/**
 *  得到 relativeFile 的绝对路径
 */
function getAbsoluteFile(relativeFile, refFile) {
  if (/https?:\/\//.test(relativeFile)) {
    return relativeFile;
  }
  var basedir = path.dirname(refFile);
  relativeFile.split('/').forEach(function(part) {
    if (part === '..') {
      basedir = path.dirname(basedir);
    } else if (part !== '.') {
      basedir += '/' + part;
    }
  });
  return basedir;
}

/**
 * 判断文件是否是本地的文件
 */
function isFileLocal(file) {
  var hasHttp = false;

  file = file.replace(/^https?:\/\//, function() {
    hasHttp = true;
    return '';
  });

  return !hasHttp || (hasHttp && /^(?:localhost|192|172|127)\b/.test(file));
}

/**
 *  解析 index 文件，获取此文件的 head、body、bodyAttrs、js、css、img 信息
 *
 *  注意：如果 index 文件在本地的域名下，表示是在本地调试，则不处理它上面的 CSS/JS 资源
 */
function parseIndexPage(index) {
  var deferred = Q.defer();

  function parse(err, response, html) {
    var data = {
        head: null,
        body: null,
        bodyAttrs: {},
        js: [],
        css: [],
        img: []
      },
      originalHtml = html,
      allowedImgExtensions = ['png', 'gif', 'jpg', 'jpeg', 'svg'],
      re;

    if (err) {
      deferred.reject(err);
    }


    // Step 1: 按先后顺序找出 HTML 中所有 js
    html = html.replace(reScript, function(raw, quote, src) {
      data.js.push(getAbsoluteFile(src, index));
      return '';
    });

    // Step 2: 按先后顺序找出 HTML 中所有 css
    html = html.replace(reStyle, function(raw, quote, href) {
      data.css.push(getAbsoluteFile(href, index));
      return '';
    });

    // Step 3: 去掉 HTML 中的所有注释，注释不要去掉，要不会影响生成 bootstrap 文件
    // html = html.replace(/<\!--.*?-->/g, '');


    // Step 4: 取出 head 标签之间的所有内容（注意：压缩后的代码可能不以 </head> 结尾，但一定会有 <body attribute...>
    var match = html.match(/<head>([\s\S]*?)(?:<\/head>|<body\b)/i);
    if (match) {
      data.head = match[1];
    } else {
      deferred.reject(new Error("Can't parse index page's head"));
    }

    // Step 5: 取出 body 标签之间的所有内容 及 body 上的属性（注意：压缩后的代码可能不以 </body> 结尾）
    match = html.match(/<body([^>]*)>([\s\S]*)/);
    if (match) {
      var bodyAttrs = match[1].trim(),
        body = match[2].trim(),
        bodyEndIndex = body.indexOf('</body>');

      bodyAttrs.replace(/([\w\-]+)\s*=\s*['"]([^'"]*)['"]/g, function(raw, key, val) {
        data.bodyAttrs[key] = val;
      });

      if (bodyEndIndex > 0) {
        body = body.substring(0, bodyEndIndex);
      }
      data.body = body;
    } else {
      deferred.reject(new Error("Can't parse index page's body"));
    }


    // Step 6: 找出 HTML 及 所有 CSS 中的图片
    re = /(?:src=|url\(\s*)['"]?([^'"\)]+)['"]?\s*\)?/g;
    if (data.css.length) {
      Q.all(data.css.map(function(file) {
        var defer = Q.defer();
        if (isFileLocal(file)) {
          defer.resolve({file: file, content: ''});
        } else {
          // 得到所有 CSS 的 content
          request.get(file, function(err, response, content) {
            if (err) {
              defer.reject(err);
            } else {
              defer.resolve({file: file, content: content});
            }
          });
        }
        return defer.promise;
      })).then(
        function(contents) {
          // 解析里面的图片
          contents.concat({file: index, content: html}).forEach(function(obj) {
            obj.content.replace(re, function(raw, url) {
              var ext = url.split(/[#\?]/).shift().split('.').pop();
              if (allowedImgExtensions.indexOf(ext) >= 0) {
                data.img.push(getAbsoluteFile(url, obj.file));
              }
            });
          });
          deferred.resolve({html: originalHtml, data: data});
        },
        function() { deferred.reject(new Error('Request css file error, please retry later')) }
      );
    }

  }


  if (/^https?:\/\//.test(index)) {
    request.get(index, parse);
  } else {
    fs.readFile(index, function(err, data) {
      parse(err, null, data.toString());
    });
  }

  return deferred.promise;
}


function replaceByEmpty() { return ''; }
function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 *  给项目生成一个 bootstrap 文件，一般只要用第一次生成的即可，以后每次应该都一样（不要修改 html 标签上的属性即可）
 */
function generateBootstrapContent(meta, indexHtml, indexData) {
  var metaUrl = (Bootstrap.api('') + '&app=' + meta.app).replace(/[&?]{1,2}/, '?'),
    script = '<script spa-bootstrap="' + escapeHTML(metaUrl) + '" src="'+ Bootstrap.bootstrapJs +'"></script>';

  indexHtml = indexHtml
    .replace(reScript, replaceByEmpty)
    .replace(reStyle, replaceByEmpty)
    .replace(indexData.head, '<meta charset="utf-8"><title>Loading...</title>')
    .replace(indexData.body, '<h1 style="text-align:center">Loading...</h1>' + script)
    .replace(/<body[^>]*>/, '<body>');  // body上的属性保存在meta中，到时直接可以更新，不用写到bootstrap中，保持这个文件精简

  return indexHtml;
}

module.exports = Bootstrap;
