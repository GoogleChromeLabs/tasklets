tasklets.export(class SimpleClass {
  static get VERSION() {
    return 42;
  }

  static GetVersion() {
    return 42;
  }

  constructor() {
    this._answer = 42;
    this.isAPromise = Promise.resolve(42);
  }

  getAnswer() {
    return 42;
  }

  get answerGetter() {
    return 42;
  }

  returnsAPromise(someValue) {
    return Promise.resolve(someValue + 1);
  }

  get isAPromiseGetter() {
    return Promise.resolve(42);
  }
});
