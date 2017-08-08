tasklets.export(function simpleFunction() {
  return 42;
});

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
