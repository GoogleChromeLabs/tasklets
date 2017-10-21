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
importScripts('comlink.global.min.js');
tasklets = {
  transferProxy: Comlink.proxyValue,
};

(function() {
  addEventListener('message', event => {
    const obj = {};
    self.tasklets.export = (thing, name = '') => {
      if (!name)
        name = thing.name;
      obj[name] = thing;
    };
    importScripts(event.data.path);
    Comlink.expose(obj, event.data.port);
  });
})();
