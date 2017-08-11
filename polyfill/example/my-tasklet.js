tasklets.export(class GreatClass {
  constructor() {
    this._state = 42;
  }

  uselessMethod(number) {
    return `This is a string containing the number ${number + this._state}`;
  }
});

tasklets.export(function abc() {
  return 'The alphabet!';
});

tasklets.export(function takesABuffer(buf) {
  return new Uint8Array(buf).map(b => b + 1).join(' ');
});
