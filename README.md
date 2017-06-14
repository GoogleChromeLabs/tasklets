# Problem
Most modern development platforms favor a multi-threaded approach by default. Typically, the split
for work is:

- __Main thread__: UI manipulation, event/input routing
- __Background thread(s)__: All other work

iOS and Android native platforms, for example, restrict (by default) the usage of any APIs not
critical to UI manipulation on the main thread.

The web has support for this model via `WebWorkers`. However:

* `postMessage()` is clunky and difficult to use
* WebWorkers are expensive (~5MB per thread)

As a result, worker adoption has been minimal at best and the default model
remains to put all work on the main thread. In order to encourage developers to move work off the
main thread, we propose a more ergonomic solution with Tasklets.

# Tasklet API

__Note__: APIs described below are just strawperson proposals. We think they're pretty cool but
    there's always room for improvement.

**TL,DR:**

```js
// fetcher.js
export async function fetchDataObject() {
    const resp = await fetch(/*...*/)
    const json = await resp.json();
    return doSomeExpensiveProcessing(json);
}
```

```js
// app.js
const fetcher = await tasklet.addModule('fetcher.js');
const json = await fetcher.fetchDataObject();
// ...
```

## Problem

Today, many uses of WebWorkers follow a structure similar to:

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

## Exported classes and functions

The code below shows a basic example of the tasklet API.

```js
// speaker.js
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
const module = await tasklet.addModule('speaker.js');

const speaker = new module.Speaker();
console.log(await speaker.sayHello('world!')); // Logs "Hello world!".

console.log(await api.add(2, 3)); // Logs '5'.
```

A few things are happening here, so let's step through them individually.

```js
const api = await tasklet.addModule('tasklet.js');
```

This loads the module into the tasklet's javascript global scope. This is similar to invoking
`new Worker('tasklet.js')`. Also similar to WebWorkers, the tasklet would be around for the lifetime of the page.

However, when this module is loaded, the browser will look into the script you imported and find all
of the __exported__ classes and functions. In the above example we only exported the `Speaker`
class.

`addModule` returns a "namespace" object, for which the browser creates "proxy" constructors and
functions:

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

### Supported parameter and return values

All arguments and return values go through the structured clone algorithm, which means that
functions can only accept certain kinds of objects, for example:

```js
speaker.sayHello(document.body); // Causes a DOMException as HTMLBodyElement cannot be cloned.
```

As for transferrables, we think that every parameter and return value should be transferred by default, e.g:

```js
const arr = new Int8Array(100);
api.someFunction(arr);
// arr has now been transferred, you can't access it.
```

If web developers need copying behavior instead, they are able to make a copy in the call, e.g:

```js
api.someFunction(new Int8Array(arr));
```

## Into the weeds

We'll quickly go through some more detailed cases here. We haven't fully formed everything here yet.

### APIs Exposed

We believe that all __asynchronous__ APIs which are exposed in workers should be exposed in the
`TaskWorkletGlobalScope` (that means Sync XHR for example would not be exposed). Additionally `Atomics.wait` would
throw a `TypeError`.

We want this characteristic as we'd like to potentially run multiple tasklets in the same thread.
Some implementations have a high overhead per thread, but a smaller cost per javascript environment.

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

It will undoubtedly be useful to return instances of objects created in the tasklet. The
completely async nature of the proxies, however, make reasoning harder and handling a bit awkward.

```js
// calendarTasklet.js
export class Calendar {
  constructor(credentials) { /* ... */ }
  nextEvents(limit = 10) {
    /* ... */
    return arrayOfCalendarEntries;
  }
  generateShareLink(id) { /* ... */ }
  /* ... */
}

export class CalendarEntry {
  constructor(calender) { /* ... */ }
  get id() { /* ... */ }
  /* ... */
}
```

```js
// main.js
const {Calendar} = await tasklet.addModule('calendarTasklet.js');
const myCalendar = new Calendar(myCredentials);
const events = await myCalendar.nextEvents()
events.map(event => myCalender.generateShareLink(event.id)); // !!!
```

The last line is potentially problematic. `event.id` has been promisified. This line would create a lot of message passing under the hood: Every invocation of the `map()` callback would have to wait for `event.id` to resolve just pass a message back to the tasklet to invoke `generateShareLink`.

This can be solved by the author by architecting their tasklet appropriately. A method like `myCalender.generateShareLinks(events)` for example would be much more efficient.

### What gets exported?

Consider this tasklet code:

```js
import {A} from 'a.js';

export class B extends A {}
```

What gets exported?

`¯\_(ツ)_/¯` We aren't sure. Options:
  1. Export everything down the to `Object` prototype.
  2. Only export things declared in the class (i.e. everything from `B`, but not `A`)
  3. Don’t do magic – rely on explicit listing of things to expose (á la `static get exportedProperties() { return [/*...*/]; }`)
  4. WebIDL

#### Failure Modes

In all of the above code samples, we've had a "synchronous" constructor call. We've just done this
because we think it's easier to use, but this brings up the question:

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

We think this is OK. It also handles cases above where if a class is killed and couldn't be
recreated the behavior is sane.
