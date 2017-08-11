self.tasklets = {};

(function() {

  const transferProxySymbol = Symbol('transferProxy');

  function transferProxy(obj) {
    obj[transferProxySymbol] = true;
    return obj;
  }

  function isTransferProxy(obj) {
    return obj && obj[transferProxySymbol];
  }

  function convertToTransferProxy(obj) {
    const {port1, port2} = new MessageChannel();
    new ExportedObject(obj, port1);
    return {
      result: {'__transfer_proxy_port': port2},
      transferables: [port2]
    };
  }

  function prepareResult(result) {
    // TODO prepareResult actually needs to perform a structured clone tree
    // walk of the data as we want to allow:
    // return {foo: transferProxy(foo)};
    // We also don't want to directly mutate the data as:
    // class A {
    //   constructor() { this.b = {b: transferProxy(new B())} }
    //   method1() { return this.b; }
    //   method2() { this.b.foo; /* should work */ }
    // }
    if (isTransferProxy(result))
      return convertToTransferProxy(result);

    return {
      result,
      transferables: transferableProperties(result),
    };
  }

  function isTransferable(thing) {
    return (thing instanceof ArrayBuffer) ||
      (thing instanceof MessagePort)
  }

  function *iterateAllProperties(obj) {
    if(typeof obj === 'string') return obj;
    if(!obj) return;
    const vals = Object.values(obj);
    yield* vals;
    for(const val of vals)
      yield* iterateAllProperties(val);
  }

  function transferableProperties(obj) {
    return Array.from(iterateAllProperties(obj))
      .filter(val => isTransferable(val));
  }

  class ExportedObject {
    constructor(obj, port) {
      this.object = obj;
      this.port = port;
      this.port.onmessage = this.onmessage.bind(this);
      this.port.start();
    }

    async onmessage(event) {
      switch(event.data.type) {
        case 'GET':
        case 'APPLY': {
          let obj = await event.data.callPath.reduce((obj, propName) => obj[propName], this.object);
          if(event.data.type === 'APPLY') {
            event.data.callPath.pop();
            obj = await obj.apply(null, event.data.argumentsList);
          }
          const {result, transferables} = prepareResult(obj);
          this.port.postMessage({
            id: event.data.id,
            result,
          }, transferables);
          break;
        }
        case 'CONSTRUCT': {
          const constructor = event.data.callPath.reduce((obj, propName) => obj[propName], this.object);
          const instance = new constructor(...event.data.argumentsList);
          const {port1, port2} = new MessageChannel();
          new ExportedObject(instance, port1);
          this.port.postMessage({
            id: event.data.id,
            result: {
              port: port2,
            },
          }, [port2]);
          break;
        }
      }
    }
  }

  addEventListener('message', event => {
    try {
      const obj = {};
      self.tasklets.export = (thing, name = '') => {
        if(!name) name = thing.name;
        obj[name] = thing;
      };
      importScripts(event.data.path);
      const {port1, port2} = new MessageChannel();
      new ExportedObject(obj, port1);
      delete self.tasklets.export;

      postMessage({
        id: event.data.id,
        port: port2,
      }, [port2]);
    } catch(error) {
      postMessage({
        id: event.data.id,
        error: error.toString(),
        stack: error.stack,
      });
    }
  });

  self.transferProxy = transferProxy;
})();
