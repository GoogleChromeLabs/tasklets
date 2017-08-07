function pingPongMessage(target, msg, transferables) {
  const id = performance.now();

  return new Promise(resolve => {
    target.addEventListener('message', function handler(event) {
      if(event.data.id !== id) return;
      target.removeEventListener('message', handler);
      resolve(event);
    });
    target.postMessage(Object.assign(msg, {id}), transferables);
  });
}

function isTransferable(thing) {
  return (thing instanceof ArrayBuffer) ||
    (thing instanceof ImageBitmap) ||
    (thing instanceof MessagePort);
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
          // TODO: Actually walk the entire tree
          const transferableArguments = argumentsList.filter(val => isTransferable(val));
          const response = await pingPongMessage(
            that._worker,
            {
              path,
              exportName,
              type: 'APPLY',
              // thisArg,
              argumentsList,
            }, transferableArguments);
          return response.data.result;
        },
        // async construct(_, argumentsList, newTarget) {
        //   const response = await pingPongMessage(that._worker, {
        //     path,
        //     exportName,
        //     type: 'CONSTRUCT',
        //     // thisArg,
        //     argumentsList,
        //   });
        //   return response.data.result;
        // },
      });
    }
    return proxyCollection;
  }
}
