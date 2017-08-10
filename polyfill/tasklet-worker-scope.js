self.tasklets = {};

(function() {

  function isTransferable(thing) {
    return (thing instanceof ArrayBuffer) ||
      (thing instanceof MessagePort)
  }

  function *iterateAllProperties(obj) {
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
          let result = await event.data.callPath.reduce((obj, propName) => obj[propName], this.object);
          if(event.data.type === 'APPLY') {
            event.data.callPath.pop();
            result = await result.apply(null, event.data.argumentsList);
          }
          this.port.postMessage({
            id: event.data.id,
            result,
          }, transferableProperties(result));
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
      const module = new ExportedObject(obj, port1);
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
})();
