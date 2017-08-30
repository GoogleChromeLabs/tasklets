function asyncGeneratorSupport() {
  try {
    eval(`async function* f(){}`)
  } catch (e) {
    return false;
  }
  return true;
}

tasklets.export(function simpleFunction() {
  return 42;
});

tasklets.export(function concatenatesParameters(num, str) {
  return num + str;
});

if (asyncGeneratorSupport())
  eval(`
    tasklets.export(async function* generator() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    });

    tasklets.export(async function* lengthCountingGenerator() {
      let str = yield;
      while(str !== '') {
        str = yield str.length;
      }
    });
  `);

tasklets.export(function takesABuffer(buffer) {
  return buffer.byteLength;
});

tasklets.export(function takesAMessagePort(port) {
  port.postMessage('pong');
});

tasklets.export(function nestedBuffer(obj) {
  const buffer = obj.a.b.c.buffer;
  return buffer.byteLength;
});

tasklets.export(function returnsAPromise(someValue) {
  return Promise.resolve(someValue + 1);
});

tasklets.export(function returnsAMessagePort() {
  return {
    port: (new MessageChannel()).port1
  };
});

tasklets.export(async function doesAFetch(someValue) {
  const response = await fetch('/base/tests/fixtures/file.txt');
  return await response.text();
});
