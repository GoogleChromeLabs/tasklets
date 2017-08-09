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
    singleRun: true,
    concurrency: Infinity,
    browsers: ['Chrome', 'Firefox', 'Safari'],
    customLaunchers: {
      DockerChrome: {
          base: 'Chrome',
          flags: ['--no-sandbox', '--headless'],
      },
    },
  };

  if (process.env.INSIDE_DOCKER) {
    configuration.browsers = ['DockerChrome'];
  }

  config.set(configuration);
};
