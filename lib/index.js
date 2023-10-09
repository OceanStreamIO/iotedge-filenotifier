const path = require('path');
const EventEmitter = require('events');
const {Logger, Utils} = require('@pineview/iotedge-common');

const {Monitor, StateMachine} = Utils;
const Config = require('./config.js');
const DirWatcher = require('./dirwatcher.js');
const Metadata = require('./metadata.js');

const extensionToLoad = '.raw';

module.exports = class FileWatcher extends EventEmitter {
  static get STATE_ALARM() {
    return 'offline';
  }

  static get STATE_OK() {
    return 'online';
  }

  constructor(opts = {}) {
    super();

    this.dirWatcher = null;
    this.opts = opts;
    this.alertSent = false;
    this.currentState = Config.currentState || 'OK';
    Config.lastUpdateTime = Date.now();

    this.metadata = new Metadata();
    this.stateMachine = new StateMachine({
      currentState: this.currentState,
      broadcastInterval: Config.alertSendingInterval * Config.alertSendingIntervalUnit,
      states: {
        stateALERT: FileWatcher.STATE_ALARM,
        stateOK: FileWatcher.STATE_OK
      }
    });

    this.stateMachine.on('beforeChange', (newState, prevState) => {
      Logger.debug(`stateChange – newState: ${newState}; prevState: ${prevState}`);
    });

    this.stateMachine.on('change', ({state, prevState, attempt, timeoutMs}) => {
      Logger.info(`Sending currentState: ${state}`);

      Config.$update('currentState', state).then(() => {
        Logger.debug(`Updated config property "currentState" with "${state}".`);
        this.emit('stateChange', {state, prevState, attempt, timeoutMs});
      });

    });

    this.monitor = new Monitor({
      maxTimeout: Config.connectMaxTimeout, // 10 min maximum
      minTimeout: Config.connectMinTimeout,

      operation: ({attempt}) => {
        const {lastUpdateTime = 0} = Config;
        const timeDiff = Date.now() - lastUpdateTime;
        const result = timeDiff < Config.alertTimeDiff;

        if (timeDiff >= Config.connectMaxTimeout) {
          const {exec} = require('child_process');
          Logger.debug(`> refreshing folder: ${Config.RAW_DATA_FOLDER}...`);
          exec(`ls -la ${Config.RAW_DATA_FOLDER}`, (error, stdout, stderr) => {
            let errorMsg = '';
            let stderrMsg = '';
            const util = require('util');

            if (error) {
              errorMsg = 'error=' + util.inspect(error) + '; ';
            }
            if (stderr) {
              stderrMsg = 'stderr= ' + util.inspect(stderr) + '; ';
            }

            Logger.debug(`  refreshed folder. ${errorMsg}${stderrMsg}`);
          });
        }

        Logger.debug(`> operation: lastUpdateTime=${lastUpdateTime}, timeDiff=${timeDiff}, result=${result}`);

        return result;
      },

      onResult: (ok, {attempt, timeoutMs}) => {
        Logger.debug(`onResult: ${ok}; attempt=${attempt}; timeoutMs=${timeoutMs}`);

        if (ok) {
          this.stateMachine.stateOk({attempt, timeoutMs});
        } else {
          this.stateMachine.stateAlert({attempt, timeoutMs});
        }
      }
    });
  }

  onDirUpdate(name, stats) {
    Logger.debug(`FileWatcher.onDirUpdate: ${name}; updated: ${stats.updated}.`);

    if (stats.updated) {
      Config.lastUpdateTime = stats.updated;
    }
  }

  start() {
    const {currentState = 'OK', RAW_DATA_FOLDER, alertTimeDiff, filePollingInterval, fileWatchThreshold} = Config;
    const folderPath = path.resolve(RAW_DATA_FOLDER);

    this.metadata.on('data', data => {
      Config.$update('metadataUploaded', true).then(() => {
        const util = require('util');
        Logger.debug(`Metadata: ${util.inspect(data)}.`);
        this.emit('metadata', data, this.metadata.filename);
      });
    });

    this.dirWatcher = new DirWatcher({folderPath, extensionToLoad, filePollingInterval, fileWatchThreshold});

    this.dirWatcher.on('watcher:fileadd', (name, stats) => {
      this.emit('fileadd', name, stats);
      this.onDirUpdate(name, stats);

      if (!Config.metadataUploaded) {
        this.metadata.add(name);
      }
    });

    this.dirWatcher.on('watcher:dirchange', (name, stats) => this.onDirUpdate(name, stats));
    this.dirWatcher.on('watcher:fileupdate', (fileName, stats, folder) => {
      this.onDirUpdate(fileName, stats);
    });

    Logger.info(`Watcher started in ${currentState} state; waiting for updates on folder ${folderPath}...`);
    Logger.info(`Alarm is set after ${alertTimeDiff}ms of inactivity.`);

    this.monitor.perform();
  }

  async close() {
    Logger.info('Closing watcher and monitor...');
    try {
      this.monitor.stop();
    } catch (err) {
      Logger.warn(`Error while stopping monitor: ${err.stack}`);
    }

    await this.dirWatcher.close();
    Logger.info('Monitor and watcher are now stopped.');
  }

  async restart() {
    await this.close();

    this.start();
  }

  stateChange(newState, prevState, opts) {
    this.currentState = newState;
    Config.currentState = newState;

    Logger.debug(`stateChange – newState: ${newState}; prevState: ${prevState}`);

    if (this.broadcastStateChange(newState, prevState)) {
      this.lastBroadcastTime = Date.now();
      Logger.info(`Sending currentState: ${Config.currentState}`);
      this.emit('stateChange', {state: Config.currentState, prevState, ...opts});
    }
  }


  /**
   * @todo: implement processing
   *
   * @param fileName
   * @param stats
   * @return {Promise<void>}
   */
  async onFileUpdate ({fileName, stats}) {
    const date = new Date(stats.updated);
    //Logger.info(`Processing ${fileName} at ${date}`);
  }

};
