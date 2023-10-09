const {Client} = require('@pineview/iotedge-common');
const {v4: uuidv4} = require('uuid');

function propertyParser(value) {
  return JSON.parse(value);
}

module.exports = class ModuleClient extends Client {
  get Twin_Properties() {
    return this.__twinProperties;
  }

  get defaultOutput() {
    return 'currentState';
  }

  constructor({client, config}) {
    super({client, config});

    if (process.env.LOCAL_ENV) {
      return;
    }

    // Act on input messages to the module.
    client.on('inputMessage', (inputName, msg) => {
      if (inputName === 'oceanstream') {
        try {
          const messageBody = JSON.parse(msg.data.toString('ascii'));
          console.log('Received message from oceanstream:', messageBody);

        } catch (err) {
          console.error('Error while decoding response from oceanstream:', err);
        }
      }
    });
  }

  setTwinProperties() {
    const defaultProperties = Client.Twin_Properties;
    const defaults = Object.keys(defaultProperties).reduce((prev, key) => {
      if (typeof defaultProperties[key] == 'string') {
        prev[key] = {
          configKey: defaultProperties[key]
        };
      } else {
        prev[key] = defaultProperties[key];
      }

      return prev;
    }, {});

    this.__twinProperties = Object.assign({}, defaults, {
      Raw_Data_FolderPath: {
        configKey: 'RAW_DATA_FOLDER'
      },

      Status_Check_Interval_Milliseconds: {
        configKey: 'connectMaxTimeout',
        parser: propertyParser
      },

      MetadataUploaded: {
        configKey: 'metadataUploaded',
        parser: propertyParser
      },

      Alert_Time_Diff_Milliseconds: {
        configKey: 'alertTimeDiff',
        parser: propertyParser
      },

      Status_Update_Interval_Minutes: {
        configKey: 'alertSendingInterval',
        parser: propertyParser
      },

      enableRawFileProcessing: {
        configKey: 'enableRawFileProcessing',
        parser: propertyParser
      },

      continuousProcessing: {
        configKey: 'continuousProcessing',
        parser: propertyParser
      },

      currentState: {
        configKey: 'currentState',
        parser: propertyParser
      }
    });
  }

};
