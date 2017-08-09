tasklets.export({
  myNumber: 42
}, 'numberObject');

tasklets.export({
  myFunction: _ => 42
}, 'functionObject');

class MyClass {
  getNumber() {
    return 42;
  }
}

tasklets.export({
  MyClass,
}, 'classObject');
