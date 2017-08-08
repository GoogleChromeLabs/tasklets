class TaskletModule {
  constructor() {
    this._exports = {};
    this.onmessage = this.onmessage.bind(this);
  }

  export(obj) {
    this._exports[obj.name] = obj;
    // TODO: Exports with same name?!
  }

  get port() {
    return this._port;
  }

  set port(val) {
    this._port = val;
    this._port.onmessage = this.onmessage;
  }

  async onmessage(event) {
    switch(event.data.type) {
      case 'APPLY': {
        const method = this._exports[event.data.exportName];
        const result = await method.apply(null, event.data.argumentsList);
        this.port.postMessage({
          id: event.data.id,
          result,
        });
        break;
      }
      case 'CONSTRUCT': {
        const constructor = this._exports[event.data.exportName];
        const instance = new constructor(...event.data.argumentsList);
        const port = event.data.port;
        event.data.port.addEventListener('message', async event => {
          switch(event.data.type) {
            case 'APPLY': {
              const result = await event.data.callPath.reduce((instance, property, idx) => {
                if(idx === event.data.callPath.length - 1)
                  return instance[property].apply(instance, event.data.argumentsList);
                return instance[property];
              }, instance);
              port.postMessage({
                id: event.data.id,
                result,
              });
              break;
            }
            case 'GET': {
              const result = await event.data.callPath.reduce((instance, property) => instance[property], instance);
              port.postMessage({
                id: event.data.id,
                result,
              });
              break;
            }
            default:
              throw Error(`Unknown message type "${event.data.type}"`);
          }
        });
        port.start();
        break;
      }
    }
  }

  get structure() {
    return Object.keys(this._exports);
  }
}

addEventListener('message', event => {
  try {
    const module = new TaskletModule();

    self.tasklets = module;
    importScripts(event.data.path);
    delete self.tasklets;

    const {port1, port2} = new MessageChannel();
    module.port = port1;
    postMessage({
      id: event.data.id,
      port: port2,
      structure: module.structure,
    }, [port2]);
  } catch(error) {
    postMessage({
      id: event.data.id,
      error: error.toString(),
    });
  }
});
