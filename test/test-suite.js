class TestSuite {
  constructor() {
    this.tests  = [];
  }
  run(name, func) {
    let result = false;
    try {
      result = func();
    }
    catch (error) {
      this.tests.push({
        type: 'error',
        name: name,
        error: error,
      });
    }
    this.tests.push({
      type: result ? 'success' : 'failure',
      name: name,
    });
  }
  summary() {
    return {
      tests:   this.tests,
      success: this.tests.filter(x => x.type === 'success'),
      failure: this.tests.filter(x => x.type === 'failure'),
      errors:  this.tests.filter(x => x.type === 'error'),
    };
  }
  message() {
    const summary = this.summary();
    return `Passed ${summary.success.length}/${summary.tests.length} tests. `
      + (summary.errors.length > 0 ? `Caught ${summary.errors.length} errors.` : '');
  }
  logFailures(log) {
    for (const test of this.tests) {
      if (test.type === 'success') continue;
      const message = (test.type === 'failure')
        ? `Failed test ${test.name}!`
        : `Caught error in test ${test.name}: ${test.error.toString()}`;
      log(message);
    }
  }
}

export default TestSuite;
