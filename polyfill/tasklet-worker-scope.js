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
tasklets = {};

(function() {
  const transferProxySymbol = Symbol('transferProxy');

  tasklets.transferProxy = (obj) => {
    obj[transferProxySymbol] = true;
    return obj;
  };

  function isTransferProxy(obj) {
    return obj && obj[transferProxySymbol];
  }

  function convertToTransferProxy(obj) {
    const {port1, port2} = new MessageChannel();
    exportObject(obj, port1);
    return {
      result: {'__transfer_proxy_port': port2},
      transferables: [port2],
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
      (thing instanceof MessagePort);
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

  function exportObject(rootObj, port) {
    port.onmessage = async event => {
      const callPath = event.data.callPath;
      switch (event.data.type) {
        case 'GET':
        case 'APPLY': {
          let obj = await callPath.reduce((obj, propName) => obj[propName], rootObj);
          if (event.data.type === 'APPLY') {
            callPath.pop();
            const that = await callPath.reduce((obj, propName) => obj[propName], rootObj);
            const isAsyncGenerator = obj.constructor.name === 'AsyncGeneratorFunction';
            obj = await obj.apply(that, event.data.argumentsList);
            // If the function being called is an async generator, proxy the
            // result.
            if (isAsyncGenerator)
              obj = tasklets.transferProxy(obj);
          }
          const {result, transferables} = prepareResult(obj);
          port.postMessage({
            id: event.data.id,
            result,
          }, transferables);
          break;
        }
        case 'CONSTRUCT': {
          const constructor = callPath.reduce((obj, propName) => obj[propName], rootObj);
          const instance = new constructor(...event.data.argumentsList);
          const {port1, port2} = new MessageChannel();
          exportObject(instance, port1);
          port.postMessage({
            id: event.data.id,
            result: {
              port: port2,
            },
          }, [port2]);
          break;
        }
      }
    };
  }

  addEventListener('message', event => {
    try {
      const obj = {};
      self.tasklets.export = (thing, name = '') => {
        if (!name)
          name = thing.name;
        obj[name] = thing;
      };
      importScripts(event.data.path);
      const {port1, port2} = new MessageChannel();
      exportObject(obj, port1);
      delete self.tasklets.export;

      postMessage({
        id: event.data.id,
        port: port2,
      }, [port2]);
    } catch (error) {
      postMessage({
        id: event.data.id,
        error: error.toString(),
        stack: error.stack,
      });
    }
  });
})();
