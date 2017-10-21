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

  class Tasklets {
    constructor(worker) {
      this._worker = worker;
    }

    async addModule(path) {
      const {port1, port2} = new MessageChannel();
      this._worker.postMessage({port: port2, path}, [port2]);
      return Comlink.proxy(port1);
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
