const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { createMachine, createActor, assign } = require('xstate');

module.exports = class FolderMonitor extends EventEmitter {
  constructor(folderPath, fileExtension, interval, timeout = 10000, stabilityDelay = 3000) {
    super();
    this.folderPath = folderPath;
    this.fileExtension = fileExtension;
    this.interval = interval;
    this.timeout = timeout;
    this.files = new Set();
    this.watcher = null;
    this.currentStatus = null;
    this.timeoutId = null;
    this.stabilityDelay = stabilityDelay;
    this.initialScanDone = false;

    this.initStateMachine();
    this.performInitialScan();
  }

  initStateMachine() {
    const monitorMachine = createMachine({
      id: 'monitor',
      initial: 'offline',
      context: {
        files: this.files
      },
      states: {
        offline: {
          on: { FILE_ADDED: 'online', START: 'online' }
        },
        online: {
          entry: assign({
            files: ({ context }) => context.files
          }),
          on: { NO_FILES: 'offline', TIMEOUT: 'offline', STOP: 'offline' }
        }
      }
    });

    this.monitorActor = createActor(monitorMachine);
    this.monitorActor.subscribe((state) => {
      if (state.value !== this.currentStatus) {
        this.currentStatus = state.value;
        this.emit('status', state.value);
      }
    });

    this.monitorActor.start();
  }

  performInitialScan() {
    exec(`ls ${this.folderPath}/*.${this.fileExtension}`, (error, stdout) => {
      if (!error) {
        const initialFiles = stdout.split('\n').filter(file => file);
        initialFiles.forEach(file => this.files.add(path.resolve(this.folderPath, path.basename(file))));
      }

      this.initialScanDone = true;
      this.startMonitoring();
      this.startCustomMonitoring();
    });
  }

  startMonitoring() {
    this.watcher = chokidar.watch(`${this.folderPath}/*.${this.fileExtension}`, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', filePath => {
      const resolvedPath = path.resolve(filePath);
      this.files.add(resolvedPath);

      if (this.initialScanDone) {
        this.waitForFileStability(resolvedPath);
      }
    });
  }

  startCustomMonitoring() {
    setInterval(() => {
      exec(`ls ${this.folderPath}/*.${this.fileExtension}`, (error, stdout) => {
        if (error) {
          this.monitorActor.send({ type: 'NO_FILES' });

          return;
        }

        const currentFiles = new Set(stdout.split('\n').filter(file => file).map(file => path.resolve(this.folderPath, path.basename(file))));
        currentFiles.forEach(file => {
          if (!this.files.has(file)) {
            this.files.add(file);
            if (this.initialScanDone) {
              this.waitForFileStability(file);
            }
          }
        });
      });
    }, this.interval);
  }

  waitForFileStability(filePath) {
    const checkFileStability = (prevSize, callback) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          callback(err);
          return;
        }

        const newSize = stats.size;
        if (newSize === prevSize) {
          callback(null, true);
        } else {
          setTimeout(() => checkFileStability(newSize, callback), this.stabilityDelay);
        }
      });
    };

    setTimeout(() => {
      checkFileStability(0, (err, stable) => {
        if (stable) {
          this.monitorActor.send({ type: 'FILE_ADDED' });
          this.emit('fileAdded', filePath);
          this.resetTimeout();
        }
      });
    }, this.stabilityDelay);
  }

  resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.monitorActor.send({ type: 'TIMEOUT' });
    }, this.timeout);
  }

  close() {
    this.watcher.close();
    this.monitorActor.stop();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
};

