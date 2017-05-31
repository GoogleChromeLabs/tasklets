# Problem
Most modern development platforms favor a multi-threaded approach by default. Typically, the split
for work is:

- __Main thread__: UI manipulation, event/input routing
- __Background thread(s)__: All other work

iOS and Android native platforms, for example, restrict (by default) the usage of any APIs not
critical to UI manipulation on the main thread.

The web has support for this model via `WebWorkers`, though the `postMessage()` interface is clunky
and difficult to use. As a result, worker adoption has been minimal at best and the default model
remains to put all work on the main thread. In order to encourage developers to move work off the
main thread, we need a more ergonomic solution.

In anticipation of increased usage of threads, we will also need a solution that scales well with
regards to resource usage. Workers require ~5MB per thread. This proposal suggests using worklets as
the fundamental execution context to better support a world where multiple parties are using
threading heavily.

# Tasklet API

__Note__: APIs described below are just strawperson proposals. We think they're pretty cool but
    there's always room for improvement.

Today, many uses of `WebWorkers` follow a structure similar to:

```js
const worker = new Worker('worker.js');
worker.postMessage({'cmd':'fetch', 'url':'example.com'});
```

```js
// worker.js
self.addEventListener('message', (evt) => {
  switch (evt.data.cmd) {
    case 'fetch':
      performFetch(evt.data);
      break;
    default:
      throw Error(`Invalid command: ${evt.data.cmd}`);
  }
});
```

A switch statement in the worker then typically routes messages to the correct API. The tasklet API
exposes this behavior natively, by allowing a class within one context to expose methods to other
contexts.

## Exported Classes and Functions

The below example shows a basic example of the tasklet API.

```js
// tasklet.js
export class Speaker {
  sayHello(message) {
    return `Hello ${message}`;
  }
}

export function add(a, b) {
  return a + b;
}
```

```js
const api = await tasklet.addModule('tasklet.js');

const speaker = new api.Speaker();
console.log(await speaker.sayHello('world!')); // Logs "Hello world!".

console.log(await api.add(2, 3)); // Logs '5'.
```

A few things are happening here - so lets step through them individually.

```js
const api = await tasklet.addModule('tasklet.js');
```

This loads the module into the tasklets javascript global scope. This is similar to invoking
`new Worker('tasklet.js')`.

However, when this module is loaded, the browser will look into the script you imported and find all
of the __exported__ classes and functions. In the above example we only exported the `Speaker`
class.

`addModule` returns a "namespace" object, which the browser has created "proxy" constructors and
functions. I.e.

```js
api.Speaker.toString() == 'function Speaker() { [native code] }';
api.Speaker.prototype.sayHello.toString() == 'function sayHello() { [native code] }';
```

<details>
  <summary>
    <span>Note: `[native code]`</span>
  </summary>

  <p>
    It doesn't have to be `[native code]` above, this is just to give people the idea that this
    class on the main thread side, is synthesized by the browser.
  </p>
</details>

All of the functions now return promises, for example:

```js
const p = speaker.sayHello('world!');
```

A web developer can trigger multiple function calls at the some time, e.g.

```js
const results = await Promise.all([
    speaker.sayHello('world!'),
    speaker.sayHello('mars!')
]);
```

All arguments and return values go through the structured clone algorithm, which means that
functions can only accept certain kinds of objects, for example:

```js
speaker.sayHello(document.body); // Causes a DOMException as HTMLBodyElement cannot be cloned.
```

We believe that this is a far easier mechanism for web developers to use additional threads in their
web pages/applications.

## Into the weeds

We'll quickly go through some more detailed cases here. We haven't fully formed everything here yet.

### APIs Exposed

We believe that all __asynchronous__ APIs which are exposed in workers should be exposed in the
`TaskWorkletGlobalScope`. (Sync XHR, etc, would not be exposed). Additionally `Atomics.wait` would
throw a `TypeError`.

We want this characteristic as we'd like to potentially run multiple tasklets in the same thread.
Some implementations have a high overhead per thread, but a smaller cost per javascript environment.

### Transferables

We think that everything should transfer by default, e.g:

```js
const arr = new Int8Array(100);
api.someFunction(arr);
// arr has now been transferred, you can't access it.
```

If web developers need copying behaviour instead, they are able to make a copy in the call, e.g:

```js
api.someFunction(new Int8Array(arr));
```

### Events

We think it's very compelling to have classes inside the `TaskWorkletGlobalScope` to be able to
extend from `EventTarget`, for example:

```js
// api.js
export class FetchManager extends EventTarget {
  performFetch(url) {
    const response = await fetch(url);
    if (response.get('Content-Type').startsWith('image')) {
      this.dispatchEvent('image-fetched');
    }
  }
}
```

```js
const api = await tasklet.addModule('api.js');
const fetchManager = new api.FetchManager();
fetchManager.addEventListener('image-fetched', () => {
  // maybe update some UI?
});

fetchManager.performFetch('cats.png');
```

The data provided with the event is structured cloned, similar to arguments and return values.

## Things not fully thought out yet

This is a very early stage proposal, so it has a few problems that we'll need to sort out.

### Returning references

TODO add example about why returning references is useful + things need to be in same module.

```js
// TODO add example here. \o/
```

### What gets exported?

`¯\_(ツ)_/¯`

We actually don't know. E.g.


```js
import {A} from 'a.js';

export class B extends A {}
```

In the above example does `A` get exported? We aren't sure. Options:
  1. Export everything down the to Object prototype.
  2. Only export things declared in the class?
  3. Remove the magic auto exposing, rely on explicit listing of things to expose.
  4. WebIDL

### Tasklets being Killed

TODO: Write about how this might be a bad idea, strongly tied to the page lifetime.

It'd be nice to have a policy for tasklets to be killed in order for the browser to free up memory
if required.  Such a policy might be, after 60 seconds of inactivity and no pending tasks, the
`TaskWorkletGlobalScope` would be killed.

As a result of this we'd need a callback to allow a class to save state, in order to be resumed with
the appropriate state. For example:

```js
// a.js
export class A {
  constructor(data, state) {
    this.multiply = data.multiply;
    this.i = state.i || 0;
  }

  compute() {
    return this.multiple * this.i++;
  }

  willBeKilled() { // Oh dear - this is a bad name.
    return {
      i: this.i,
    }
  }
}
```

```js
const api = tasklet.addModule('a.js');
const a = new api.A({multiply: 2});
a.compute() == 0;

// "sleep" for 2 mins.
await new Promise((r) => { setTimeout(r, 120 * 1000); });

a.compute() == 2;
a.compute() == 4;
```

In the above example, we'd like the `TaskWorkletGlobalScope` to be destroyed during the "sleep".
When it gets destroyed all active classes will have their `willBeKilled` method called such that
they can save their state.

When `a.compute()` gets called for the second time, the `constructor(data, state)` will be called
again, additionally with the `state` parameter which was structured cloned from the `willBeKilled()`
method.

There are issues with this however, web developers might try and "ping" the tasklet every few
seconds to keep it alive, so they don't have to deal with this behaviour, or may not think about
implementing the `willBeKilled()` method by default.

There needs to be some work here :). It may be enough for browsers to kill just the main page and
not worry about this complexity.

### Passing References Around

We think it's interesting that this opens up the capability for passing references of classes (maybe
also functions?) around. For example:

```js
// api.js
export class A {
  func() { return 42; }
}

export class B {
  constructor(a) {
    this.a = a;
    this.f = null;
  }

  setA(a) {
    this.a = a;
  }

  runFunction(f) {
    return f();
  }
}

export function four() {
  return 4;
}
```

```js
const api = await tasklet.addModule('api.js');

const a = new api.A();
const b = new api.B(a);
```

In the above example, this passes a "reference" of `A` to `B`. This would be useful if you had
different parts of a web application using a different network manager class for example. This
ability to compose is quite common for other threading APIs.

```js
b.runFunction(api.four);
```

The above snippet shows how functions could be passed around as well.

The issues with introducing these references into the API. For example allowing them generally means
that it becomes difficult to reason about the `willBeKilled()` extension described above. (If they
are part of the structured clone algorithm for tasklets, then they can't cloned during
`willBeKilled()` as it would be possible to create reference cycles).

One solution would be to only allow them for constructor calls. For example:

```js
let a = new api.A();
const b = new api.B(a); // succeeds.

a = new api.A();
b.setA(a); // fails.
```

#### Failure Modes

In all of the above code samples, we've had a "synchronous" constructor call. We've just done this
because we think its easier to use, but this brings up the question:

```js
// api.js
export class A {
  constructor() { throw Error('nope'); }
  func() { return 42; }
}
```

```js
const api = await tasklet.addModule('api.js');
const a = new api.A(); // Succeeds.

a.func(); // Fails, as we couldn't create the underlying class.
```

We think this is OK, it also handles cases above where if a class is killed and couldn't be
re-created the behaviour is sane.

### Javascript Integration

We think it'd be nice if there was first class javascript support for the tasklet API, here is one
reasonably simple proposal:

```js
const api = await remote {
  import foo from 'foo.js';

  export class A {
    func() {
      foo();
      return 42;
    }
  }
};

const a = new api.A();
a.func() == 42;
```

Here everything in the "remote" block is treated like a separate ES6 module file. This would run in
the default `tasklet`. We'd also like support to run the above code in a "named" tasklet.

A proposal that wouldn't work would be something like: `remote@my-tasklet { }`. (But we'd like
something like this).

The above snippet has the downside that it would need to be parsed twice in a naïve implementation.

