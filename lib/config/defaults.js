module.exports = {
  // location of .raw data files to monitor
  RAW_DATA_FOLDER: '/app/tmpdata',

  // the time in milliseconds to wait until changing the state to ALARM
  alertTimeDiff: 120000,

  // the log level of console messages: debug|info|warn|error
  logLevel: 'debug',

  // currently either json or text
  logFormat: 'text',

  logTimestamp: false,

  // the number of minutes (or another unit specified by alertSendingIntervalUnit in milliseconds)
  // to wait until sending a state update message
  alertSendingInterval: 30,

  // the unit for the alert interval calculation in milliseconds (e.g. one minute = 60000 milliseconds)
  alertSendingIntervalUnit: 60000,

  // maximum retry timeout for status check
  connectMaxTimeout: 90000,

  // minimum retry timeout for status check
  connectMinTimeout: 100,

  // how often is chokidar (3rd party library) checks if the file or folder was changed
  // - polling is necessary for watching externally mounted folders inside docker containers
  filePollingInterval: 10000,

  continuousProcessing: false,

  // whether to send the file for further processing
  enableRawFileProcessing: true,

  fileWatchThreshold: 10000,

  currentState: 'online'
};
