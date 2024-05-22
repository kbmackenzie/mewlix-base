export default function testSuite(runTests) {
  const results = [];

  function run(name, fn) {
    try {
      const value = fn();
      results.push({
        type: value ? 'success' : 'failure',
        name: name,
      });
    }
    catch (error) {
      results.push({
        type: 'error',
        name: name,
        error: error,
      });
    }
  }

  function addMessage(messages, result) {
    if (result.type === 'failure') {
      messages.push(`Test "${result.name}" failed!`);
    }
    else if (result.type === 'error') {
      messages.push(`Error caught in test "${result.name}": ${result.error}`);
    }
    return messages;
  }

  runTests(run);
  const successCount = results.filter(x => x.type === 'success').length;

  return {
    passed: `Passed ${successCount}/${results.length} tests!`,
    messages: results.reduce(addMessage, []),
  };
}
