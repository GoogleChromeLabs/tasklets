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

tasklets.export(function takesABuffer(buf) {
  return new Uint8Array(buf).map(b => b + 1).join(' ');
});
