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

This syntax could (and probably should) also be augmented to work with other worklets like AnimationWorklet or PaintWorklet.
