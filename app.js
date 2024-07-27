const util = require('util');
const dotenv = require('dotenv');
dotenv.config();

const { Message } = require('azure-iot-device');
const { Logger, Application } = require('@pineview/iotedge-common');

const {resolve} = require('path');
const FileWatcher = require('./lib');
const Client = require('./lib/client.js');
const Config = require('./lib/config.js');
const FolderMonitor = require('./lib/monitor.js');


Application.TELEMETRY = {
  Echosounder_State: 'StateEchosounder',
  CTD_State: 'StateCTDSensor'
};

Application.PROPERTIES = {
  EchosounderLastFileUpdateTime: 'EchosounderLastFileUpdateTime',
  CTDLastFileUpdateTime: 'CTDLastFileUpdateTime'
};

Application.run({ Client }).then(async client => {
  const { enableCTDProcessing, enableRawFileProcessing } = Config;

  if (enableRawFileProcessing) {
    createFolderWatcher(client, {
      folderPath: resolve(Config.RAW_DATA_FOLDER),
      extensionToLoad: 'raw',
      outputDest: 'raw_file_added',
      stateParam: Application.TELEMETRY.Echosounder_State,
      lastUpdateTimeParam: Application.PROPERTIES.EchosounderLastFileUpdateTime
    });
  }

  if (enableCTDProcessing) {
    createFolderWatcher(client, {
      folderPath: Config.CTD_DATA_FOLDER,
      extensionToLoad: 'hdr',
      outputDest: 'hdr_file_added',
      stateParam: Application.TELEMETRY.CTD_State,
      lastUpdateTimeParam: Application.PROPERTIES.CTDLastFileUpdateTime
    });
  }

});

const createFolderWatcher = (client, opts) => {
  const folderMonitor = new FolderMonitor(opts.folderPath, opts.extensionToLoad, 5000);

  folderMonitor.on('fileAdded', filePath => {
    console.log(`File added: ${filePath}`);
    const lastUpdateTime = new Date().toISOString();

    const message = new Message(JSON.stringify({
      file_added_path: filePath,
      file_added_type: opts.extensionToLoad,
      file_added_time: lastUpdateTime,
      event: 'fileadd'
    }));

    client.sendOutputEvent(message, {output: opts.outputDest});
  });

  folderMonitor.on('status', status => {
    console.log(`Status: ${opts.stateParam} ${status}`);

    const data = {
      [opts.stateParam]: status
    };

    const message = new Message(JSON.stringify(data));
    message.properties.add('alarm', (status === FileWatcher.STATE_ALARM) ? 'true' : 'false');

    client.sendOutputEvent(message);
  });
};
