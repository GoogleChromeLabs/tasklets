> Note: There needs to be some work here :). It may be enough for browsers to kill the tasklet together with the main page and
not worry about this complexity.

### Tasklets being Killed

It could be nice to have a policy for tasklets to be killed in order for the browser to free up memory
if required. Such a policy might be: After 60 seconds of inactivity and no pending tasks, the
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

Saving state becomes even more complex when references come into play. Developers might try to
persist references to main thread which will make resuming a tasklet a lot harder to implement.
