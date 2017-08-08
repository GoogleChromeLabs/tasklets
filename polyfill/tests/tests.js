const expect = chai.expect;

describe('Tasklet Polyfill', function() {
  beforeEach(function(done) {
    const script = document.createElement('script');
    script.src = '/base/tasklet-polyfill.js';
    script.onload = _ => done();
    document.head.appendChild(script);
  });

  afterEach(function() {
    tasklets.terminate();
  });

  it('can load an empty tasklet file', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/empty_tasklet.js');
    expect(Object.keys(tasklet)).to.have.length(0);
  });

  it('can invoke an exported function', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(Object.keys(tasklet)).to.contain('simpleFunction');
    expect(await tasklet.simpleFunction()).to.equal(42);
  });

  it('can instantiate an exported class', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance.getAnswer()).to.equal(42);
  });

  it('can invoke methods on an instance multiple times even', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance.getAnswer()).to.equal(42);
    expect(await instance.getAnswer()).to.equal(42);
    expect(await instance.getAnswer()).to.equal(42);
  });

  it('can transfer a buffer', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(Object.keys(tasklet)).to.contain('takesABuffer');
    const typedArr = new Uint8Array([1, 2, 3]);
    expect(await tasklet.takesABuffer(typedArr.buffer)).to.equal(3);
    expect(typedArr.length).to.equal(0);
  });

  it('can transfer a nested buffer', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(Object.keys(tasklet)).to.contain('nestedBuffer');
    const typedArr = new Uint8Array([1, 2, 3]);
    expect(await tasklet.nestedBuffer({a: {b: {c: {buffer: typedArr.buffer}}}})).to.equal(3);
    expect(typedArr.length).to.equal(0);
  });

  it('can transfer a message port', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(Object.keys(tasklet)).to.contain('takesAMessagePort');
    const {port1, port2} = new MessageChannel();
    tasklet.takesAMessagePort(port1);
    return new Promise(resolve => {
      port2.onmessage = event => {
        event.data === 'pong';
        resolve();
      };
    });
  });

  it('can access properties of instantiated classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance._answer).to.equal(42);
  });

  it('can access getters of instantiated classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance.answerGetter).to.equal(43);
  });
});
