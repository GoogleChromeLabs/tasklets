module.exports = function(config) {
const configuration = {
    basePath: '',
    frameworks: ['mocha', 'chai'],
    files: [
      {
        pattern: '*.txt',
        included: false,
      },
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
      'tests/tests.js',
    ],
    preprocessors: {
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    singleRun: true,
    concurrency: Infinity,
    browsers: ['Chrome', 'Firefox', 'Safari'],
    customLaunchers: {
      DockerChrome: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox'],
      } ,
    },
  };

  if (process.env.INSIDE_DOCKER) {
    configuration.browsers = ['DockerChrome'];
  }

  config.set(configuration);
};
