tasklets.export(class SimpleClass {
  constructor() {
    this._answer = 42;
  }

  getAnswer() {
    return this._answer;
  }

  get answerGetter() {
    return this._answer + 1;
  }
});
