/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {
  if (self.tasklets)
    return;
  let pingPongCounter = 0;
  function pingPongMessage(target, msg, transferables) {
    const id = pingPongCounter++;

    return new Promise(resolve => {
      target.addEventListener('message', function handler(event) {
        if (event.data.id !== id)
          return;
        target.removeEventListener('message', handler);
        resolve(event);
      });
      target.postMessage(Object.assign(msg, {id}), transferables);
    });
  }

  function asyncIteratorSupport() {
    return 'asyncIterator' in Symbol;
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
        if (property === 'then' && callPath.length === 0) {
          return {then: _ => proxy};
        } else if (asyncIteratorSupport() && property === Symbol.asyncIterator) {
          // For now, only async generators use `Symbol.asyncIterator` and they
          // return themselves, so we emulate that behavior here.
          return _ => proxy;
        } else if (property === 'then') {
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

  const TRANSFERABLE_TYPES = [ArrayBuffer, MessagePort];
  function isTransferable(thing) {
    return TRANSFERABLE_TYPES.some(type => thing instanceof type);
  }

  function* iterateAllProperties(obj) {
    if (!obj)
      return;
    if (typeof obj === 'string')
      return;
    yield obj;
    let vals = Object.values(obj);
    if (Array.isArray(obj))
      vals = obj;

    for (const val of vals)
      yield* iterateAllProperties(val);
  }

  function transferableProperties(obj) {
    return Array.from(iterateAllProperties(obj))
      .filter(val => isTransferable(val));
  }

  function hydrateTransferProxies(obj) {
    // TODO This needs to be a tree-walk, when the worker performs a tree walk.
    const transferProxyPort = obj && obj['__transfer_proxy_port'];
    if (transferProxyPort)
      return newBatchingProxy(resolveFunction(transferProxyPort));

    return obj;
  }

  function resolveFunction(port) {
    port.start();
    return async (type, callPath, argumentsList) => {
      const response = await pingPongMessage(
        port,
        {
          type,
          callPath,
          argumentsList,
        },
        transferableProperties(argumentsList)
      );
      // TODO could make CONSTRUCT not a special case, by returning it in the
      // __transfer_proxy_port form.
      if (type === 'CONSTRUCT')
        return newBatchingProxy(resolveFunction(response.data.result.port));
      return hydrateTransferProxies(response.data.result);
    };
  }

  class Tasklets {
    constructor(worker) {
      this._worker = worker;
    }

    async addModule(path) {
      const response = await pingPongMessage(this._worker, {
        path,
      });
      if ('error' in response.data) {
        console.error(response.data.stack);
        throw Error(response.data.error);
      }
      const port = response.data.port;
      return newBatchingProxy(resolveFunction(port));
    }

    terminate() {
      this._worker.terminate();
      delete self.tasklets;
    }
  }

  const scriptURL = new URL('tasklet-worker-scope.js', document.currentScript.src);
  const worker = new Worker(scriptURL.toString());
  self.tasklets = new Tasklets(worker);
})();
