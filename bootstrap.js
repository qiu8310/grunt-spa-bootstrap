(function() {
  var type, each, extend, trim, ajax, Store, BS,

    regTripBracket = /\[|\]/g,    //  去除中括号 [foo] => foo
    regUrlKeys = /([\w\-]+)|(\[[\w\-]*\])/g; // 匹配 bar[foo][xx][] 这种形式 => [ 'bar', '[foo]', '[xxx]', '[]' ]


  type = function(obj) {
    return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
  };

  each = function(obj, cb, context) {
    switch (type(obj)) {
      case 'array':
        for (var i = 0, l = obj.length; i < l; ++i) {
          if (false === cb.call(context, obj[i], i, obj)) { break; }
        }
        break;
      case 'object':
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            if (false === cb.call(context, obj[k], k, obj)) { break; }
          }
        }
        break;
      default :
        break;
    }
  };

  extend = function() {
    var args, deep, target;

    args = [].slice.call(arguments);
    if (type(args[0]) === 'boolean') {
      deep = args.shift();
    }
    target = args.shift() || {};

    each(args, function(next) {
      if (type(next) === 'object') {
        each(next, function(val, key) {
          if (deep && type(val) === 'object') {
            target[key] = extend(target[key], val, deep);
          } else {
            target[key] = val;
          }
        });
      }
    });

    return target;
  };

  trim = function(str) { return str.replace(/^\s+|\s+$/, ''); };


  /**
   * {} => foo[aa]=aa&foo[bb]=bb&bar[]=cc&bar[]=dd
   */
  function objectToQuery(obj) {
    var rtn = [],
      wrapBracket = function(str) { return str.replace(/^([\w\-]+)/, '[$1]');}; // a[b][] => [a][b][]

    each(obj, function(val, key) {
      key = encodeURIComponent(key);

      switch (type(val)) {
        case 'object':
          each(objectToQuery(val).split('&'), function() {
            rtn.push(key + wrapBracket(arguments[0]));
          });
          break;
        case 'array':
          each(val, function() {
            rtn.push(key + '[]=' + encodeURIComponent(arguments[0].toString()));
          });
          break;
        default :
          rtn.push(key + '=' + encodeURIComponent(val));
      }
    });

    return rtn.join('&');
  }

  /**
   * foo[aa]=aa&foo[bb]=bb&bar[]=cc&bar[]=dd => {}
   */
  function queryToObject(query) {
    var data = {},
      stripBracket = function(str) { return str.replace(regTripBracket, ''); };

    each(query.split('&'), function(pair) {
      var key, val, refData;

      pair = pair.split('=');
      if (pair.length !== 2) { return true; }

      key = decodeURIComponent(pair[0]);
      val = decodeURIComponent(pair[1]);

      refData = data;
      each(key.match(regUrlKeys), function(match, index, refMatches) {
        var matchKey = stripBracket(match),
          nextMatch = refMatches[index+1];

        if (!matchKey) { return false; }

        if (!nextMatch) {
          refData[matchKey] = val; // 末端
        } else if (nextMatch === '[]') {
          if (refData[matchKey] === undefined) { refData[matchKey] = []; }
          refData[matchKey].push(val);
        } else if (nextMatch.charAt(0) === '[') {
          if (refData[matchKey] === undefined) { refData[matchKey] = {}; }
          refData = refData[matchKey];
        }
      });
    });

    return data;
  }

  function appendQuery(url, query) {
    var fragments, queryString;
    queryString = type(query) === 'object' ? objectToQuery(query) : query;
    if (!queryString) { return url; }

    fragments = url.split('#');
    fragments[0] = (fragments[0] + '&' + queryString).replace(/[&?]{1,2}/, '?');
    return fragments.join('#');
  }


  ajax = (function ajaxInitialize() {

    // XHR version 2
    // 新增加了几个返回的数据类型:   text arraybuffer blob 或 document，默认 text
    // 同时增加了几个发送的数据类型: FormData Blog ArrayBuffer
    // http://www.html5rocks.com/zh/tutorials/file/xhr2/

    var empty = function() {}, //rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,

      jsonType = 'application/json',
      htmlType = 'text/html',

      blankRE = /^\s*$/,

      XHR2Types = ['arraybuffer', 'blob', 'document'];

    function ajaxBeforeSend(xhr, settings) {
      var context = settings.context;
      if (settings.beforeSend.call(context, xhr, settings) === false) {
        return false;
      }
    }

    // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
    function ajaxComplete(status, xhr, settings) {
      var context = settings.context;
      settings.complete.call(context, xhr, status);
    }

    function ajaxSuccess(data, xhr, settings) {
      var context = settings.context, status = 'success';
      settings.success.call(context, data, status, xhr);
      ajaxComplete(status, xhr, settings);
    }

    // type: "timeout", "error", "abort", "parsererror"
    function ajaxError(error, type, xhr, settings) {
      var context = settings.context;
      settings.error.call(context, xhr, type, error);
      ajaxComplete(type, xhr, settings);
    }

    var config = {
      type       : 'GET',
      url        : null,
      //dataType: 'json',
      beforeSend : empty,
      success    : empty,
      error      : empty,
      complete   : empty,
      xhr        : function() {
        return new window.XMLHttpRequest();
      },

      // MIME types mapping
      // IIS returns Javascript as "application/x-javascript"
      accepts    : {
        script: 'text/javascript, application/javascript, application/x-javascript',
        json  : jsonType,
        xml   : 'application/xml, text/xml',
        html  : htmlType,
        text  : 'text/plain'
      },
      timeout    : 0,
      // Whether data should be serialized to string
      processData: true,
      // Whether the browser should be allowed to cache GET responses
      cache      : false
    };

    function mimeToDataType(mime) {
      if (mime) {
        mime = mime.split(';', 2)[0];
      }
      return mime && (mime === htmlType ? 'html' :
        mime === jsonType ? 'json' : scriptTypeRE.test(mime) ? 'script' : xmlTypeRE.test(mime) && 'xml' ) || 'text';
    }

    function serializeData(options) {
      if (options.processData && options.data && (typeof options.data) !== 'string') {
        options.data = objectToQuery(options.data).replace(/%20/g, '+');
      }

      if (options.data && (!options.type || options.type.toUpperCase() === 'GET')) {
        options.url = appendQuery(options.url, options.data);
        options.data = undefined;
      }

    }


    function ajax(options) {
      var settings = extend({}, config, options || {});
      // 是否是 XHR 2 的返回类型，及发送类型
      var isXHR2ReturnType, isXHR2SendType;

      var dataType = settings.dataType;


      // 默认使用当前 url
      if (!settings.url) {
        settings.url = window.location.toString();
      }

      // 如果跨域了，就不用加上 X-Requested-With 头部，否则请求中会先带有 OPTIONS 请求，再是你指定的 GET/POST..
      if (!settings.crossDomain) {
        settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) && RegExp.$2 !== window.location.host;
      }

      // XHR 2 可以直接发送 FormData、Blog、File、ArrayBuffer 等
      if (settings.data && (typeof settings.data) !== 'string' && type(settings.data) !== 'object') {
        isXHR2SendType = true;
      } else {
        serializeData(settings);
      }

      if (settings.cache === false) {
        settings.url = appendQuery(settings.url, '_=' + Date.now());
      }
      var mime = settings.accepts[dataType], headers = {}, setHeader = function(name, value) {
        headers[name.toLowerCase()] = [name, value];
      }, protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 :
        window.location.protocol, xhr = settings.xhr(), nativeSetHeader = xhr.setRequestHeader, abortTimeout;

      // 支持设置 responseType 肯定要支持 indexOf，所以这里不写兼容版的 indexOf
      if (XHR2Types.indexOf && XHR2Types.indexOf(dataType) >= 0) {
        xhr.responseType = dataType;
        isXHR2ReturnType = true;
      }

      if (!settings.crossDomain) {
        setHeader('X-Requested-With', 'XMLHttpRequest');
      }
      setHeader('Accept', mime || '*/*');

      mime = settings.mimeType;
      if (mime) {
        if (mime.indexOf(',') > -1) {
          mime = mime.split(',', 2)[0];
        }
        if (xhr.overrideMimeType) {
          xhr.overrideMimeType(mime);
        }
      }

      // XHR 2 不需要设置 Header，如果是上传 File，会自动加上 multipart/form-data
      if (!isXHR2SendType && (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() !== 'GET'))) {
        setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded');
      }

      var name;
      if (settings.headers) {
        for (name in settings.headers) {
          setHeader(name, settings.headers[name]);
        }
      }
      xhr.setRequestHeader = setHeader;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          xhr.onreadystatechange = empty;
          clearTimeout(abortTimeout);
          var result, error = false;
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || (xhr.status === 0 && protocol === 'file:')) {
            dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'));

            // 取 xhr 1/2 的返回值
            result = isXHR2ReturnType ? xhr.response : xhr.responseText;

            try {
              // http://perfectionkills.com/global-eval-what-are-the-options/
              switch (dataType) {
                case 'script':
                  eval('eval')(result);
                  break;
                case 'xml':
                  result = xhr.responseXML;
                  break;
                case 'json':
                  result = blankRE.test(result) ? null : JSON.parse(result);
                  break;
                //case 'arraybuffer':  break;
                //case 'blob':         break;
                //case 'document':     break;
                default :
                  break;
              }
            } catch (e) { error = e; }

            if (error) {
              ajaxError(error, 'parsererror', xhr, settings);
            } else {
              ajaxSuccess(result, xhr, settings);
            }
          } else {
            ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings);
          }
        }
      };

      if (ajaxBeforeSend(xhr, settings) === false) {
        xhr.abort();
        ajaxError(null, 'abort', xhr, settings);
        return xhr;
      }


      var async = 'async' in settings ? settings.async : true;
      xhr.open(settings.type, settings.url, async, settings.username, settings.password);

      for (name in headers) {
        nativeSetHeader.apply(xhr, headers[name]);
      }

      if (settings.timeout > 0) {
        abortTimeout = setTimeout(function() {
          xhr.onreadystatechange = empty;
          xhr.abort();
          ajaxError(null, 'timeout', xhr, settings);
        }, settings.timeout);
      }
      // avoid sending empty string (#319)
      xhr.send(settings.data ? settings.data : null);
      return xhr;
    }

    return ajax;
  })();


  Store = {
    prefix: function(key) { var p = 'spa-bs_'; return key.indexOf(p) === 0 ? key : p + key; },
    set: function(key, obj) {
      localStorage.setItem(this.prefix(key), JSON.stringify(obj));
      return obj;
    },
    get: function(key) {
      var r;
      try {
        r = JSON.parse(localStorage.getItem(this.prefix(key)))
      } catch (e) { r = undefined; }
      return r;
    },
    has: function(key) {
      return this.prefix(key) in localStorage;
    },
    del: function(key) {
      localStorage.removeItem(this.prefix(key));
    },
    empty: function() {
      for (var key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          if (this.prefix(key) === key){
            localStorage.removeItem(key);
          }
        }
      }
    }
  };


  function resolve(params, fn, cb) {
    var len =  params.length,
      result = new Array(len),
      check = function() {
        if (len === 0) { cb(result); }
      },
      done = function(index) {
        return function(data) {
          result[index] = data;
          len = len - 1;
          check();
        };
      };

    check();
    each(params, function(item, index, ref) {
      fn.call(ref, item, done(index));
    });
  }
  function request(url, fn, opts) {
    opts = opts || {};
    var errorFn = opts.error;
    opts.error = function(xhr, type, error) {
      var rtn;
      if (errorFn) {
        rtn = errorFn.apply(arguments);
      }

      if (rtn !== false) {
        console.error('spa: ', type, error);
      }
    };
    opts.url = url;
    opts.success = fn;
    return ajax(opts);
  }
  function isOffline() { return navigator && navigator.onLine === false; }
  function arrayDiff(newArray, oldArray) {
    var added = [], deleted = [];
    each(newArray, function(item) {
      if (oldArray.indexOf(item) === -1) {
        added.push(item);
      }
    });

    each(oldArray, function(item) {
      if (newArray.indexOf(item) === -1) {
        deleted.push(item);
      }
    });
    return {added: added, deleted: deleted};
  }
  function arrayFilter(arr, fn) {
    var result = [];
    each(arr, function(item, index, ref) {
      if (true === fn(item, index, ref)) {
        result.push(item);
      }
    });
    return result;
  }

  function dirname(url) {
    url = url.split(/[#\?]/).shift().replace(/\/$/, '').split('/');
    url.pop();
    return url.join('/');
  }
  function extname(url) { return url.split(/[#\?]/).shift().split('.').pop(); }
  function getAbsoluteFile(relativeFile, refFile) {
    // 这还是在具体用的地方先判断一下吧
    //if (isAbsoluteAsset(relativeFile)) {
    //  return relativeFile;
    //}
    var basedir = dirname(refFile);
    relativeFile.split('/').forEach(function(part) {
      if (part === '..') {
        basedir = dirname(basedir);
      } else if (part !== '.') {
        basedir += '/' + part;
      }
    });
    return basedir;
  }
  function isAbsoluteAsset(asset) { return /^https?:\/\//.test(asset); }

  var reCssAsset = /(?:src=|url\(\s*)['"]?([^'"\)#?]+)(?:[#?](?:[^'"\)]*))?['"]?\s*\)?/g;
  function replaceCssRelativeAsset(filename, fileContent) {
    return fileContent.replace(reCssAsset, function(raw, asset) {
      if (!isAbsoluteAsset(asset)) {
        return raw.replace(asset, getAbsoluteFile(asset, filename));
      }
      return raw;
    });
  }

  function insertCSSCode(code) {
    var s = document.createElement('style');
    s.type = 'text/css';
    s.media = 'screen';
    if (s.styleSheet) {     // for ie
      s.styleSheet.cssText = code;
    } else {                 // for w3c
      s.appendChild(document.createTextNode(code));
    }
    (document.getElementsByTagName('head')[0]).appendChild(s);
  }
  function insertJSCode(code) {
    //var s = document.createElement('script');
    //s.type = 'text/javascript';
    //try { s.appendChild(document.createTextNode(code)); }
    //catch (e) { s.text = code; }
    //document.body.appendChild(s);
    eval('eval')(code);
  }


  // 在当前页面上弹出一个 fixed 下拉条
  function slideDownUpdateTip(latestVersion) {
    var stripe = document.createElement('div');
    stripe.className = 'spa-stripe';

    stripe.style.cssText = "position:fixed;top:0;left:0;right:0;height:0;background:rgba(0,0,0,.8);z-index:99999;overflow:hidden;";
    stripe.innerHTML = '<a style="display:block;line-height:50px;color:red;text-align:center;font-size:18px;">' +
    '有新版本可用，请点此更新</a>';
    document.body.appendChild(stripe);
    stripe.querySelector('a').addEventListener('click', function() {
      // 清除版本号，再刷新页面即可
      BS.version(0);
      location.reload();
    });

    var allSeconds = 1000,
      current = + new Date,
      easing = 0.4,
      len = 50, finishedLen = 0,
      slide = function() {
        var elapsed = (+ new Date) - current;
        if (elapsed > allSeconds) {
          stripe.style.height = len + 'px';
        } else {
          finishedLen += (len - finishedLen) * easing;
          stripe.style.height = finishedLen + 'px';
          setTimeout(slide, 100);
        }
      };
    setTimeout(slide, 30);
  }

  BS = {
    version: function(v) {
      if (v !== undefined) {
        this._version = Store.set('version', parseInt(v, 10));
      } else {
        return this._version ? this._version : Store.get('version');
      }
    },
    meta: function(m) {
      if (m !== undefined) {
        this._meta = Store.set('meta', m);
      } else {
        return this._meta ? this._meta : Store.get('meta');
      }
    },

    /*
     对比新旧两个 meta 中的 js 与 css 的差异
     js 或 css 没有变化时返回 true，否则返回一个 added 及 deleted 的数组
     */
    metaAssetCompare: function(newMeta, oldMeta) {
      var result = {added: [], deleted: []};
      if (oldMeta) {
        each(['css', 'js'], function(type) {
          var diff = arrayDiff(newMeta[type], oldMeta[type]);
          result.deleted = result.deleted.concat(diff.deleted);
        });
      }

      // 验证下确实所有要添加的没有缓存（避免重复添加，删除就不用验证了）
      result.added = newMeta.css.concat(newMeta.js);
      result.added = arrayFilter(result.added, function(file) { return !Store.has(file); });

      return result;
    },

    /*
     检查缓存的完整性，如果不完整就需要重新拉缓存
     */
    checkCacheIntegrity: function() {
      if (!this.version()) {
        return false;
      }

      if (this.needLoadVersion && this.needLoadVersion !== this.version()) {
        return false;
      }

      var meta = this.meta();
      if (!meta) {
        return false;
      }

      var integrity = true;
      each(['css', 'js'], function(type) {
        each(meta[type], function(file) {
          if (!Store.has(file)) {
            integrity = false;
            return false;
          }
        });
      });

      return integrity;
    },

    /*
     从远程抓取 meta 数据
     */
    fetchMeta: function(url, cb) {
      var self = this;
      request(url, function(data) {
        if (data.status === 0) {
          var row = data.data;
          row.version = parseInt(row.version, 10);

          try {
            row.meta = JSON.parse(row.data);
          } catch(e) {}

          delete row.data;
          cb.call(self, row);
        } else {
          window.alert(data.status + ': ' + data.message);
        }
      }, {dataType: 'json', error: function() {
        window.alert('网络出问题了，加载 meta 信息失败，请刷新重试');
      }});
    },


    /*
     从远程拉取所有静态资源，如果拉取失败，对应的值是 false，而不是资源的 content
     */
    fetchAssets: function(assets, cb) {
      var self = this;
      resolve(assets, function(asset, done) {
        request(asset, function(data) {
          done(data);
        }, {
          cache: true,
          dataType: 'text',
          error: function() {
            done(false);
          }
        });
      }, function(data) {
        var map = {};
        each(assets, function(asset, index) {
          map[asset] = data[index];
        });
        cb.call(self, map);
      });
    },

    removeAssets: function(assets) {
      each(assets, function(asset) {
        Store.del(asset);
      });
    },


    run: function(metaUrl) {
      this.metaUrl = metaUrl;
      this.appName = metaUrl.replace(/^.*?\bapp=([\w-]+).*?$/, '$1');
      if (Store.get('app') !== this.appName) {
        Store.empty();
      }
      Store.set('app', this.appName);


      // 根据URL上的参数判断用户是否指定了要加载的版本
      var params = queryToObject(location.search.substr(1));
      if (params.version && /^\d+$/.test(params.version)) {
        this.needLoadVersion = params.version - 0;
      }

      if (isOffline()) {
        // TODO 做一个 offline 版本
      } else {

        // 如果缓存完整的话，直接用缓存
        if (this.checkCacheIntegrity()) {
          // 如果没有指定版本，则永远要用最新的版本
          if (!this.needLoadVersion) {
            this.on('rendered', function() {
              this.checkUpdate();
            });
          }
          this.render();
        } else { // 强制后台拉 meta 信息
          this.load(this.needLoadVersion);
        }

      }
    },


    checkUpdate: function() {
      var self = this,
        currentVersion = this.version(),
        currentTime = + new Date,
        metaUrl = this.metaUrl.replace('?m=', '?m=check');

      setTimeout(function() {
        var lastCheck = Store.get('lastCheck');
        if (lastCheck && lastCheck.version && lastCheck.time) {
          if (lastCheck.version > currentVersion) {
            slideDownUpdateTip(lastCheck.version);
            return ;
          } else if (currentTime - lastCheck.time < 24 * 3600 * 1000) {
            return ;
          }
        }

        self.fetchMeta(appendQuery(metaUrl, {version: currentVersion}), function(data) {
          Store.set('lastCheck', {time: currentTime, version: data.version});
          if (data.version > currentVersion) {
            slideDownUpdateTip(data.version);
          }
        });
      }, 2000);
    },

    /*
     加载指定版本的 meta，如果 version 为空，则拉最新版本（后台配合）
     */
    load: function(version) {

      this.fetchMeta(appendQuery(this.metaUrl, {version: version || 0}), function(data) {
        var diff = this.metaAssetCompare(data.meta, this.meta());

        this.version(data.version); // 设置版本号
        this.meta(data.meta);

        this.removeAssets(diff.deleted); // 清除不需要的 asset
        this.fetchAssets(diff.added, function(dataMap) { // 拉取新的 asset，并缓存
          var failLoadAssets = [];
          each(dataMap, function(content, key) {
            if (content) {
              // 替换 CSS 中的相对地址
              if ('css' === extname(key)) {
                content = replaceCssRelativeAsset(key, content);
              }
              Store.set(key, content);
            } else {
              failLoadAssets.push(key);
            }
          });

          if (failLoadAssets.length) {
            window.alert('以下资源加载失败，请刷新重试！\r\n' + failLoadAssets.join('\r\n'));
          } else {
            this.trigger('loaded', dataMap);
            this.render();
          }
        });
      });
    },

    /*
     渲染页面
     */
    render: function() {
      var meta = this.meta();
      // TODO 对 html 标签做处理，加上一些class，如当前浏览器信息，这样CSS中就可以利用了

      // 组装 HTML
      var head = document.querySelector('head'),
        body = document.querySelector('body');
      head.innerHTML = meta.head;
      body.innerHTML = meta.body;
      each(meta.bodyAttrs, function(val, key) { body.setAttribute(key, val); });

      // TODO 预加载图片

      // 插入CSS
      each(meta.css, function(asset) { insertCSSCode(Store.get(asset)); });

      // 插入JS
      each(meta.js, function(asset) { insertJSCode(Store.get(asset)); });

      this.trigger('rendered');
    },

    _events: {},
    trigger: function(event) {
      var args = arguments;
      each(this._events[event] || [], function(fn) {
        fn.apply(this, args);
      }, this);
    },
    on: function(event, fn) {
      if (!(event in this._events)) {
        this._events[event] = [];
      }
      this._events[event].push(fn);
    }
  };


  BS.run(document.querySelector('[spa-bootstrap]').getAttribute('spa-bootstrap'));


  BS.Store = Store;
  BS.ajax = ajax;

  if ( typeof module === "object" && typeof module.exports === "object" ) {
    module.exports = BS;
  } else {
    window.BS = BS;
  }

})();