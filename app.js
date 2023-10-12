const util = require('util');
const { Message } = require('azure-iot-device');
const { Logger, Application } = require('@pineview/iotedge-common');

const FileWatcher = require('./lib');
const Client = require('./lib/client.js');
const Config = require('./lib/config.js');

Application.TELEMETRY = {
  Echosounder_State: 'StateEchosounder',
  lastUpdateTime: 'EchosounderStateLastUpdateTime'
};

Application.PROPERTIES = {
  EchosounderLastFileUpdateTime: 'EchosounderLastFileUpdateTime',
  EchosounderMetadata: 'EchosounderMetadata'
};

Application.run({ Client }).then(client => {
  const watcher = new FileWatcher();
  watcher.on('stateChange', ({state}) => {
    try {
      const lastUpdateTime = new Date(Config.lastUpdateTime).toISOString();
      const data = {
        [Application.TELEMETRY.lastUpdateTime]: lastUpdateTime,
        [Application.TELEMETRY.Echosounder_State]: state
      };

      const message = new Message(JSON.stringify(data));
      message.properties.add('alarm', (state === FileWatcher.STATE_ALARM) ? 'true' : 'false');

      client.sendOutputEvent(message);
      client.updateProperties({
        [Application.PROPERTIES.EchosounderLastFileUpdateTime]: lastUpdateTime
      }).catch(err => {
        Logger.warn(`Error sending lastUpdateTime property: \n${util.inspect(err.message)}\n${err.stack}`)
      });

    } catch (err) {
      Logger.error(`Error: \n${util.inspect(err.message)}\n${err.stack}`);
    }
  });

  watcher.on('fileadd', (filename, stats) => {
    if (Config.enableRawFileProcessing) {
      const message = new Message(JSON.stringify({
        filename,
        continuous: Config.continuousProcessing || false,
        event: 'fileadd'
      }));

      client.sendOutputEvent(message);
      client.sendOutputEvent(message, {output: 'file_added'});
    } else {
      Logger.debug('Raw files processing via the Python module is not enabled.');
    }
  });

  watcher.start();
});
