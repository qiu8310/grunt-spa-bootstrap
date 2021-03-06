/*
 * spaBootstrap
 * 
 *
 * Copyright (c) 2014 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  // load all npm grunt tasks
  require('load-grunt-tasks')(grunt);

  var qiniuConfig = require(process.env.HOME + '/qiniu.json');

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    deployAsset: {
      bootstrap: {
        options: {
          mapUpload: true,
          overwrite: true,
          deleteUploaded: false,

          uploader: 'qiniu',
          qiniu: {
            accessKey: qiniuConfig.accessKey,
            secretKey: qiniuConfig.secretKey,
            bucket: 'design-res'
          }
        },
        files: {
          'bootstrap.js': 'bootstrap.js',
          'bootstrap.min.js': 'bootstrap.min.js'
        }
      }
    },

    uglify: {
      bootstrap: {
        files: {
          'bootstrap.min.js': 'bootstrap.js'
        }
      }
    },

    // Configuration to be run (and then tested).
    spaBootstrap: {
      default_options: {
        options: {
        },
        files: {
          'tmp/default_options': ['test/fixtures/testing', 'test/fixtures/123']
        }
      },
      custom_options: {
        options: {
          separator: ': ',
          punctuation: ' !!!'
        },
        files: {
          'tmp/custom_options': ['test/fixtures/testing', 'test/fixtures/123']
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*Test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'spaBootstrap', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

  grunt.registerTask('deploy', ['uglify:bootstrap', 'deployAsset:bootstrap']);

};
