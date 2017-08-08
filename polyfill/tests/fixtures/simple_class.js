tasklets.export(class SimpleClass {
  constructor() {
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
