module.exports = function(config) {
const configuration = {
    basePath: '',
    frameworks: ['mocha'],
    files: [
      {
        pattern: 'tasklet-polyfill.js',
        included: false,
      },
      {
        pattern: 'tasklet-worker-scope.js',
        included: false,
      },
      {
        pattern: 'tests/fixtures/*',
        included: false,
      },
      'node_modules/chai/chai.js',
      'tests/tests.js',
    ],
    preprocessors: {
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    concurrency: Infinity,
  };

  config.set(configuration);
};
