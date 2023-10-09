const path = require('path');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const {Logger} = require('@pineview/iotedge-common');

module.exports = class DirWatcher extends EventEmitter {
  /**
   * @param {string} folderPath
   * @param {string} extensionToLoad
   */
  constructor({folderPath, filePollingInterval = 500, fileWatchThreshold = 10000, extensionToLoad = '.raw'}) {
    super();

    this.files = {};
    this.extensionToLoad = extensionToLoad;
    this.filePollingInterval = filePollingInterval;
    this.chockidarWatcher = this.createFolderWatch(folderPath);
    this.fileWatchThreshold = fileWatchThreshold;

    this.on('error', (err) => {
      this.close()
        .catch(err => {
          Logger.warn(`Error while stopping dir watcher: ${err.code ? `[${err.code}]` : ''}:\n${err.stack}`);
        })
        .then(_ => {
          Logger.error(`Watcher crashed with error ${err.code ? `[${err.code}]` : ''}:\n${err.stack}`);
        });
    });
  }

  createFolderWatch(folderName) {
    Logger.debug(`chockidar: ${folderName} watcher created with polling interval: ${this.filePollingInterval}.`);

    const dirWatcher = chokidar.watch(folderName, {
      ignoreInitial: true,
      usePolling: true,
      ignored: /(^|[/\\])\../,
      interval: this.filePollingInterval,
      persistent: true,
      depth: true,
      awaitWriteFinish: false
    });

    dirWatcher
      .on('change', (pathName) => {
        //Logger.debug(`chockidar: onDirChange ${pathName}`);
        this.emit('watcher:dirchange', pathName, {
          updated: Date.now()
        });
      })
      .on('add', (pathName, stats) => this.onFileAdded(pathName, stats))
      .on('error', function(err) {
        err.code = 'watcher:parse_error';
        this.emit('error', err);
      });

    return dirWatcher;
  }

  async onFileAdded(pathName, stats) {
    const info = path.parse(pathName);
    const fileExtension = info && info.ext ? info.ext.toLowerCase() : null;

    if (!fileExtension || this.extensionToLoad !== '*' && this.extensionToLoad !== info.ext.toLowerCase()) {
      return;
    }

    const createdAt = stats && stats.birthtimeMs ? stats.birthtimeMs : Date.now();
    Logger.debug(`chockidar: onFileAdded ${pathName}; createdAt=${createdAt}`);

    if (this.lastAddedFileTime && this.lastAddedFileTime > createdAt) {
      //return;
    }

    await this.watchFile({createdAt, pathName, onFileChanged: (filePath, updated) => {
      //Logger.debug(`chockidar: onFileChanged ${filePath}.`);

      if (this.files[pathName]) {
        this.files[pathName].updated = parseInt(updated, 10);
      } else {
        Logger.debug(`chockidar: file ${filePath} is not known.`);
      }

      this.emit('watcher:fileupdate', filePath, {updated});
    }});

    this.watchFileUntilFinished({pathName, dirName: info.dir, createdAt});
    //
  }

  watchFileUntilFinished({pathName, createdAt, dirName} = {}) {
    this.files[pathName] = {
      createdAt,
      updated: createdAt
    };

    setTimeout(function fileWatch() {
      const file = this.files[pathName];

      if ((Date.now() - file.updated) > this.fileWatchThreshold) {
        console.log('|>>>> FILE ADD', pathName, file.createdAt - file.updated)
        this.emit('watcher:fileadd', pathName, {updated: createdAt}, dirName);
      } else {
        setTimeout(fileWatch.bind(this), 1000);
      }

    }.bind(this), 1000);

  }

  async closeFileWatcher() {
    if (this.fileWatcher) {
      try {
        await this.fileWatcher.close();
      } catch (err) {
        Logger.warn(`Error while stopping the file watcher: ${err.code ? `[${err.code}]` : ''}:\n${err.stack}`);
      }
    }
  }

  async watchFile({createdAt, onFileChanged, pathName}) {
    this.lastAddedFileTime = createdAt;
    await this.closeFileWatcher();

    if (!this.lastWatchedFile || this.lastWatchedFile !== path.resolve(pathName)) {
      this.lastWatchedFile = path.resolve(pathName);
      Logger.debug(`chockidar: Watching file: ${this.lastWatchedFile}`);

      this.fileWatcher = chokidar.watch(this.lastWatchedFile, {
        usePolling: true,
        interval: this.filePollingInterval,
        persistent: true,
        awaitWriteFinish: false
      });

      this.fileWatcher.on('change', (name) => {
        //Logger.debug(`chockidar: File change event fired: ${name}`);
        onFileChanged(name, Date.now());
      });
    }
  }

  async close() {
    await this.closeFileWatcher();

    try {
      await this.chockidarWatcher.close();
      this.emit('watcher:close');
      Logger.debug('chockidar: Dir watcher closed.');
    } catch (err) {
      Logger.warn(`Error while stopping dir watcher: ${err.code ? `[${err.code}]` : ''}:\n${err.stack}`);
    }
  }
};
