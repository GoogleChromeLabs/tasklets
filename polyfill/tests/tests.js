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
    expect(Object.keys(tasklet)).to.deep.equal(['simpleFunction'])
    expect(await tasklet.simpleFunction()).to.equal(42);
  });

  it('can instantiate an exported class', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance.getAnswer()).to.equal(42);
  });

  xit('can access properties of instantiated classes', async function() {
    const tasklet = await tasklets.addModule('/base/tests/fixtures/simple_class.js');
    const instance = new tasklet.SimpleClass();
    expect(await instance._answer).to.equal(42);
  });
});
