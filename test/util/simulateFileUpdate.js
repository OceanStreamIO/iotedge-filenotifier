const fs = require('fs-extra');
const runIntervalMs = 1000;

let stopped = false;
const start = async function(fileName, {interval = runIntervalMs, once = false, content = `test-data-${Date.now()}\n`}) {
  try {
    const data = await fs.readFile(fileName);
    const newData = [data, content].join('\n');
    await fs.writeFile(fileName, newData, 'utf8');
    const dateIso = new Date().toISOString();
    console.info(`${dateIso} | Writing test data...`);
  } catch (err) {
    console.log('File does not exist, creating....', fileName);
    await fs.writeFile(fileName, content, 'utf8');
  }

  if (stopped || once) {
    return Promise.resolve();
  }

  setTimeout(async () => {
    await start(fileName, {interval});
  }, interval);

};

module.exports = start;
module.exports.stop = function() {
  stopped = true;
};

module.exports.sync = function(fileName, {interval = runIntervalMs, content = `test-data-${Date.now()}\n`, once = false}) {
  try {
    const data = fs.readFileSync(fileName);
    const newData = [data, content].join('\n');
    fs.writeFileSync(fileName, newData, 'utf8');
    const dateIso = new Date().toISOString();
    console.info(`${dateIso} | Writing test data...`);
  } catch (err) {
    console.log('File does not exist, creating....', fileName);
    fs.writeFileSync(fileName, content, 'utf8');
  }

  if (stopped || once) {
    return;
  }

  setTimeout(() => start(fileName, {interval}), interval);
};

