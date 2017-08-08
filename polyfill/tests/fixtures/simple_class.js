tasklets.export(class SimpleClass {
  constructor() {
    this._answer = 42;
    this.isAPromise = Promise.resolve(4);
  }

  getAnswer() {
    return this._answer;
  }

  get answerGetter() {
    return this._answer + 1;
  }

  returnsAPromise(someValue) {
    return Promise.resolve(someValue + 1);
  }

  get isAPromiseGetter() {
    return Promise.resolve(4);
  }
});
