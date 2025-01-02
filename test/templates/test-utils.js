const fs   = require('fs/promises');
const path = require('path');

const configFile = path.resolve(__dirname, '../../test-config.json');

module.exports.readConfig = async function() {
  const contents = await fs.readFile(configFile);
  return JSON.parse(contents.toString());
}
