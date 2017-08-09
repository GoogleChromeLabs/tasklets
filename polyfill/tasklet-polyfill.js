(function() {
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

  function newBatchingProxy(cb) {
    let callPath = [];
    return new Proxy(function() {}, {
      construct(_, argumentsList, __) {
        const r = cb('CONSTRUCT', callPath, argumentsList);
        callPath = [];
        return r;
      },
      async apply(_, __, argumentsList, proxy) {
        const r = cb('APPLY', callPath, argumentsList);
        callPath = [];
        return r;
      },
      get(_, property, proxy) {
        // `await tasklets.addModule(...)` will try to get the `then` property
        // of the return value of `addModule(...)` and then invoke it as a
        // function. This works. Sorry.
        if(property === 'then' && callPath.length === 0) {
          return {then: _ => proxy};
        } else if(property === 'then') {
          const r = cb('GET', callPath);
          callPath = [];
          return Promise.resolve(r).then.bind(r);
        } else {
          callPath.push(property);
          return proxy;
        }
      },
    });
  }

  function isTransferable(thing) {
    return (thing instanceof ArrayBuffer) ||
      (thing instanceof ImageBitmap) ||
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

  function resolveFunction(port) {
    port.start();
    return async (type, callPath, argumentsList) =>{
      const response = await pingPongMessage(
        port,
        {
          type,
          callPath,
          argumentsList
        },
        transferableProperties(argumentsList)
      );
      if(type === 'CONSTRUCT') {
        return newBatchingProxy(resolveFunction(response.data.result.port));
      }
      return response.data.result;
    }
  }

  class Tasklets {
    constructor(worker) {
      this._worker = worker;
    }

    async addModule(path) {
      const response = await pingPongMessage(this._worker, {
        path,
      });
      if('error' in response.data) {
        console.error(response.data.stack);
        throw Error(response.data.error);
      }
      const port = response.data.port;
      return newBatchingProxy(resolveFunction(port));
    }

    terminate() {
      this._worker.terminate();
    }
  }

  const scriptURL = new URL(document.currentScript.src);
  const parts = scriptURL.pathname.split('/');
  parts.pop();
  scriptURL.pathname = `${parts.join('/')}/tasklet-worker-scope.js`;
  scriptURL.search = '';
  const worker = new Worker(scriptURL.toString());
  self.tasklets = new Tasklets(worker);
})();
