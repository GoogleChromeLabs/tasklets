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
  });

  it('can invoke an exported function', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(await tasklet.simpleFunction()).to.equal(42);
  });

  it('can instantiate an exported class', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(instance).to.exist;
  });

  it('can invoke methods on an exported class', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.getAnswer()).to.equal(42);
  });

  it('can bind methods from an exported class', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    const method = instance.getAnswer.bind(instance);
    expect(await method()).to.equal(42);
  });

  it('can invoke methods on an instance multiple times even', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.getAnswer()).to.equal(42);
    expect(await instance.getAnswer()).to.equal(42);
    expect(await instance.getAnswer()).to.equal(42);
  });

  it('can transfer a buffer', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    const typedArr = new Uint8Array([1, 2, 3]);
    expect(await tasklet.takesABuffer(typedArr.buffer)).to.equal(3);
    expect(typedArr.length).to.equal(0);
  });

  it('can transfer a nested buffer', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    const typedArr = new Uint8Array([1, 2, 3]);
    expect(await tasklet.nestedBuffer({a: {b: {c: {buffer: typedArr.buffer}}}})).to.equal(3);
    expect(typedArr.length).to.equal(0);
  });

  it('can transfer a message port', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    const {port1, port2} = new MessageChannel();
    tasklet.takesAMessagePort(port1);
    return new Promise(resolve => {
      port2.onmessage = event => {
        event.data === 'pong';
        resolve();
      };
    });
  });

  it('can transfer a message port from the tasklet', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    const {port} = await tasklet.returnsAMessagePort();
    expect(port).to.exist;
  });

  it('can access properties of instantiated classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance._answer).to.equal(42);
  });

  it('can access getters of instantiated classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.answerGetter).to.equal(42);
  });

  it('can return promises from functions', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(await tasklet.returnsAPromise(42)).to.equal(43);
  });

  it('can return promises from instance methods', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.returnsAPromise(42)).to.equal(43);
  });

  it('can return promises from instance properties ', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.isAPromise).to.equal(42);
  });

  it('can return promises from instance getters ', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.isAPromiseGetter).to.equal(42);
  });

  it('allows methods to access instance members', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = await new tasklet.SimpleClass();
    expect(await instance.returnsAPropertyValue()).to.equal(42);
  });

  it('can access static getters from classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    expect(await tasklet.SimpleClass.VERSION).to.equal(42);
  });

  it('can access static functions from classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    expect(await tasklet.SimpleClass.GetVersion()).to.equal(42);
  });

  it('can export objects', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
    expect(await tasklet.numberObject.myNumber).to.equal(42);
  });

  it('can invoke methods on objects', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
    expect(await tasklet.functionObject.myFunction()).to.equal(42);
  });

  it('can instantiate classes on objects', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_object.js');
    const instance = await new tasklet.classObject.MyClass();
    expect(await instance.getNumber()).to.equal(42);
  });

  it('can return a proxy object back from a method, and invoke on that proxy', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
    const instance = await new tasklet.GetterClass();
    const proxy = await instance.getTransferProxy();
    expect(await proxy.method()).to.equal(42);
  });

  it('can return a proxy object back from a function, and invoke on that proxy', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
    const instance = await new tasklet.returnATransferProxy();
    expect(await instance.member).to.equal(42);
  });

  it('can return a proxy for an object', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/transfer_proxies.js');
    const obj = await new tasklet.returnsATransferProxyForAnObject();
    expect(await obj.prop).to.equal(4);
    expect(await obj.func()).to.equal(5);
  });

  it('works with worker-side fetches', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_function.js');
    expect(await tasklet.doesAFetch()).to.have.string('Ohai');
  });
});
