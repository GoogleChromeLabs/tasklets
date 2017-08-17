class ReturnedClass {
  constructor() { this.member = 42; }
  method() { return 42; }
}

tasklets.export(function returnATransferProxy() {
  return tasklets.transferProxy(new ReturnedClass());
});

tasklets.export(class GetterClass {
  getTransferProxy() { return tasklets.transferProxy(new ReturnedClass()); }
});

tasklets.export(function returnsATransferProxyForAnObject() {
  return tasklets.transferProxy({
    prop: 4,
    func: _ => 5,
  });
})
