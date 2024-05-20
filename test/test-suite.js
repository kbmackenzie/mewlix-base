class TestSuite {
  constructor() {
    this.tests = [];
  }
  run(name, func) {
    const value = func();
    this.tests.push({
      type: value ? 'success' : 'failure',
      name: name,
    });
  }
  summary() {
    return {
      tests:   this.tests,
      success: this.tests.filter(x => x.type === 'success'),
      failure: this.tests.filter(x => x.type === 'failure'),
    };
  }
  message() {
    const summary = this.summary();
    return `Passed ${summary.success.length}/${summary.tests.length} tests.`;
  }
}

export default TestSuite;
