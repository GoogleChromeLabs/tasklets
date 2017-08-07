tasklets.export(class API {
  constructor() {
    this._state = 42;
  }

  tremendousMethod() {
    return `The answer is ${this._state}`;
  }
});

tasklets.export(function abc() {
  return 'The alphabet!';
});
