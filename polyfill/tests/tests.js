const expect = chai.expect;

describe('Tasklet Polyfill', function() {
  beforeEach(async function() {
    const {Tasklet} = await importPolyfill(`/base/tasklet-main-polyfill.js`);
    this.taskletWorker = new Worker('/base/tasklet-worker-polyfill.js');
    this.tasklet = new Tasklet(this.taskletWorker);
  });

  afterEach(function() {
    this.taskletWorker.terminate();
  });

  it('can load an empty tasklet file', async function() {
    const tasklet = await this.tasklet.addModule('/base/tests/fixtures/empty_tasklet.js');
  });

  it('can invoke an exported function', async function() {
    const tasklet = await this.tasklet.addModule('/base/tests/fixtures/simple_function.js');
    expect(await tasklet.simpleFunction()).to.equal(42);
  });
});

_registry = {};
importPolyfill = path => {
  if(!(path in _registry)) {
    const entry = _registry[path] = {};
    entry.promise = new Promise(resolve => entry.resolve = resolve);
    document.head.appendChild(Object.assign(
      document.createElement('script'),
      {
        type: 'module',
        innerText: `import * as X from '${path}'; _registry['${path}'].resolve(X);`,
      }
    ));
  }
  return _registry[path].promise;
}
