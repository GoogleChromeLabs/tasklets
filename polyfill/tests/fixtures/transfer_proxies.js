class ReturnedClass {
  constructor() { this.member = 42; }
  method() { return 42; }
}

tasklets.export(function returnATransferProxy() {
  return transferProxy(new ReturnedClass());
});

tasklets.export(class GetterClass {
  getTransferProxy() { return transferProxy(new ReturnedClass()); }
});

tasklets.export(function returnsATransferProxyForAnObject() {
  return transferProxy({
    prop: 4,
    func: _ => 5,
  });
})
