tasklets.export(class SimpleClass {
  constructor() {
    this._answer = 42;
    this.isAPromise = Promise.resolve(4);
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
    return Promise.resolve(4);
  }
});
