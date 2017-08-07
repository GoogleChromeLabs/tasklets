function pingPongMessage(target, msg) {
  const id = performance.now();

  return new Promise(resolve => {
    target.addEventListener('message', function handler(event) {
      if(event.data.id !== id) return;
      target.removeEventListener('message', handler);
      resolve(event);
    });
    target.postMessage(Object.assign(msg, {id}));
  });
}

export class Tasklet {
  constructor(worker) {
    this._worker = worker;
  }

  async addModule(path) {
    const response = await pingPongMessage(this._worker, {
      type: 'LOAD',
      path,
    });
    if(response.data.type === 'ERROR')
      throw Error(response.data.error);

    const that = this;
    const proxyCollection = {};
    for(const exportName of event.data.structure) {
      proxyCollection[exportName] = new Proxy(function(){}, {
        async apply(_, thisArg, argumentsList) {
          // TODO: Handle transferables
          const response = await pingPongMessage(that._worker, {
            path,
            exportName,
            type: 'APPLY',
            // thisArg,
            argumentsList,
          });
          return response.data.result;
        }
      });
    }
    return proxyCollection;
  }
}
