const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');
const mockery = require('mockery');
const assert = require('assert');
const Simulator = require('../util/simulateFileUpdate.js');

describe('Echosounder Watcher Tests', function() {
  this.timeout(25000);

  const closeWatcher = function(watcher, done) {
    watcher.close().then(_ => {
      done();
    }).catch(err => {
      done(err);
    });
  };

  const rawDataFolder = path.join(__dirname, 'tmpdata');
  const confilFileName = path.join(__dirname, '../app.conf.json');

  before(function() {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
  });

  beforeEach(function () {
    rimraf.sync(rawDataFolder);
    mkdirp.sync(rawDataFolder);
  });

  afterEach(function() {
    mockery.deregisterAll();
    mockery.resetCache();
  });

  after(function() {
    mockery.disable();
  });

  it('start watcher with no folder changes and offline state', function (done) {
    mockery.registerMock('./config.js', {
      __filename: confilFileName,
      RAW_DATA_FOLDER: rawDataFolder,
      alertTimeDiff: 100,
      alertSendingInterval: 5,
      alertSendingIntervalUnit: 100,
      connectMaxTimeout: 100,
      connectMinTimeout: 10,
      logLevel: 'info',
      async $update(prop, value) {
        console.log('updating config property', prop, value);
      }
    });

    const Watcher = require('../../lib/');
    const watch = new Watcher();

    watch.start();
    watch.on('stateChange', function({state, attempt, prevState, timeoutMs}) {
      switch (attempt) {
        case 2:
        case 3:
          try {
            assert.strictEqual(state, 'offline');
            assert.strictEqual(prevState, 'online');
            closeWatcher(watch, done);
          } catch (err) {
            closeWatcher(watch, function() {
              done(err);
            });
          }
          break;
      }
    });
  });

  it('start watcher with folder changes and online state', function (done) {
    mockery.registerMock('./config.js', {
      __filename: confilFileName,
      RAW_DATA_FOLDER: rawDataFolder,
      alertTimeDiff: 2000,
      alertSendingInterval: 1,
      alertSendingIntervalUnit: 1000,
      connectMaxTimeout: 500,
      connectMinTimeout: 100,
      filePollingInterval: 50,
      logLevel: 'info',
      async $update(prop, value) {
        console.log('updating config property', prop, value);
      }
    });

    const Watcher = require('../../lib/');
    const watch = new Watcher();
    watch.start();

    // Simulator(path.join(rawDataFolder, 'testfile.raw'), {once: true}).then(() => {
    //   console.log('simulator finished');
    // });

    let dirChangeEvent = false;
    watch.dirWatcher.once('watcher:dirchange', function(pathName, stats) {
      assert.strictEqual(pathName, path.join(rawDataFolder, 'testfile.raw'));
      assert.ok(stats.updated > Date.now() - 10000);
      dirChangeEvent = true;
    });

    Simulator.sync(path.join(rawDataFolder, 'testfile.raw'), {once: true});

    watch.on('stateChange', function({state, attempt, timeoutMs}) {
      console.log('\nSTATE', state, attempt)
      try {
        switch (attempt) {
          case 2:
          case 3:
            Simulator.sync(path.join(rawDataFolder, 'testfile.raw'), {once: true});
            break;

          case 4:
          case 5:
            assert.strictEqual(state, 'online');
            assert.ok(dirChangeEvent, 'dirchange event did not happen.');

            watch.close().then(_ => {
              done();
            });
            break;
        }
      } catch (err) {
        watch.close().then(_ => done(err));
      }
    });
  });

  xit('start watcher with folder changes and state change from OK to ALARM', function (done) {
    mockery.registerMock('./config.js', {
      __filename: confilFileName,
      RAW_DATA_FOLDER: rawDataFolder,
      alertTimeDiff: 1000,
      logLevel: 'debug',
      alertSendingInterval: 1,
      alertSendingIntervalUnit: 200,
      filePollingInterval: 500,
      connectMaxTimeout: 190,
      connectMinTimeout: 150,
      fileWatchThreshold: 1000,
      async $update(prop, value) {
        console.log('updating config property', prop, value);
      }
    });

    const Watcher = require('../../lib/');
    const watch = new Watcher();
    watch.start();

    let assertions = 0;

    let fileAddEvent = false;
    watch.dirWatcher.once('watcher:fileadd', function(pathName, stats) {
      try {
        assert.strictEqual(pathName, path.join(rawDataFolder, 'testfile.raw'));
        //assert.ok(stats.updated > Date.now() - 10000);
        console.log('UPDATED', stats.updated, Date.now() - 10000);
      } catch (err) {
        console.log('error', err);
      }

      fileAddEvent = true;
    });

    let fileUpdateEvent = false;
    watch.dirWatcher.once('watcher:fileupdate', function(pathName, stats) {
      assert.strictEqual(pathName, path.join(rawDataFolder, 'testfile.raw'));
      assert.ok(stats.updated > Date.now() - 10000);
      fileUpdateEvent = true;
    });

    let watcherClosed = false;
    watch.dirWatcher.once('watcher:close', function() {
      watcherClosed = true;
    });

    watch.on('stateChange', function({state, prevState, attempt, timeoutMs}) {
      console.log('\nSTATE', state, prevState, attempt);

      if (attempt >= 4 && state === 'offline' && prevState === 'online') {
        Simulator.sync(path.join(rawDataFolder, 'testfile.raw'), {once: true});
      }

      try {
        switch (attempt) {
          case 5:
          case 6:
            // state is back to OK
            //assert.strictEqual(state, 'online');
            assertions++;

            // watch.close().then(_ => {
            //   assert.ok(watcherClosed, 'watcher close event was not called');
            //   assert.ok(fileAddEvent, 'fileadd event was not called');
            //   assert.ok(fileUpdateEvent, 'fileupdate event was not called');
            //   assert.strictEqual(assertions, 4, 'Some state changes did not happen.');
            //   done();
            // }).catch(err => done(err));
            break;

        }
      } catch (err) {
        watch.close().then(_ => done(err));
      }
    });
  });
});
