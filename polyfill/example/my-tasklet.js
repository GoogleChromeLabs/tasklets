tasklets.export(class GreatClass {
  constructor() {
    this._state = 42;
  }

  tremendousMethod() {
    return 'This is a magnificient string';
  }
});

tasklets.export(function abc() {
  return 'The alphabet!';
});

tasklets.export(function takesABuffer(buf) {
  return new Uint8Array(buf).map(b => b + 1).join(' ');
});
