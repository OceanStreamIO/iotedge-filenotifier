const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const path = require('path');
const mockery = require('mockery');
const assert = require('assert');
const Simulator = require('../util/simulateFileUpdate.js');

xdescribe('Echosounder Metadata Tests', function() {
  this.timeout(10000);

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

  it('parse metadata', function (done) {
    mockery.registerMock('./config.js', {
      __filename: confilFileName,
      RAW_DATA_FOLDER: rawDataFolder,
      alertTimeDiff: 1000,
      logLevel: 'info',
      alertSendingInterval: 1,
      alertSendingIntervalUnit: 200,
      filePollingInterval: 100,
      connectMaxTimeout: 190,
      connectMinTimeout: 150,
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
      assert.strictEqual(pathName, path.join(rawDataFolder, 'testfile.raw'));
      assert.ok(stats.updated > Date.now() - 10000);
      fileAddEvent = true;
    });

    let watcherClosed = false;
    watch.dirWatcher.once('watcher:close', function() {
      watcherClosed = true;
    });

    watch.on('metadata', (data) => {

      watch.close().then(_ => {
        assert.strictEqual(data.Transducers.length, 2);
        assert.strictEqual(data.Transceivers.length, 2);
        assert.strictEqual(data.Transducers[0].TransducerName, 'ES38B');
        assert.strictEqual(data.Transceivers[0].TransceiverName, 'GPT 009072017a53');
        assert.strictEqual(data.Transceivers[0].Channels.length, 1);
        assert.strictEqual(data.Transceivers[0].Channels[0].ChannelID, 'GPT 009072017a53-1 ES38B');
        assert.strictEqual(data.Transceivers[0].Channels[0].Transducer.TransducerName, 'ES38B');

        assert.ok(watcherClosed, 'watcher close event was not called');
        assert.ok(fileAddEvent, 'fileadd event was not called');
        assert.strictEqual(assertions, 1, 'Some state changes did not happen.');
        done();
      }).catch(err => done(err));
    });

    const content = `<Configuration>
  <Header Copyright="Copyright(c) Kongsberg Maritime AS, Norway" ApplicationName="ES80" Version="1.3.0.0" FileFormatVersion="1.22" TimeBias="0" />

  <Transceivers MergeOperation="AddNodeTree">
    <Transceiver TransceiverName="GPT 009072017a53" EthernetAddress="009072017a53" IPAddress="157.237.14.5" Version="GPT-Q38(2)-F 1.0 009072017a53" TransceiverSoftwareVersion="070413" TransceiverNumber="1" MarketSegment="Fishery" TransceiverType="GPT" SerialNumber="0" Impedance="1000" Multiplexing="0" RxSampleFrequency="500000">
      <Channels>
        <Channel ChannelID="GPT 009072017a53-1 ES38B" ChannelIdShort="Gamli ES60 mjor geisli" MaxTxPowerTransceiver="2000" PulseDuration="0.000256;0.000512;0.001024;0.002048;0.004096" PulseDurationFM="0.000512;0.001024;0.002048;0.004096;0.008192" SampleInterval="6.4E-05;0.000128;0.000256;0.000512;0.001024" HWChannelConfiguration="0">
          <Transducer TransducerName="ES38B" SerialNumber="0" Frequency="38000" FrequencyMinimum="38000" FrequencyMaximum="38000" BeamType="1" EquivalentBeamAngle="-20.7" Gain="23;25;25.5;25.5;25" SaCorrection="0;0;0;0;0" MaxTxPowerTransducer="4000" BeamWidthAlongship="7" BeamWidthAthwartship="7" AngleSensitivityAlongship="23" AngleSensitivityAthwartship="23" AngleOffsetAlongship="0" AngleOffsetAthwartship="0" DirectivityDropAt2XBeamWidth="0" />
        </Channel>
      </Channels>
    </Transceiver>
    <Transceiver TransceiverName="WBT 743368" EthernetAddress="0090720b57c8" IPAddress="157.237.14.100" Version="[0] Ethernet: 00:90:72:0B:57:C8&#xD;&#xA;[1] Parts-list: WBT 371790/F&#xD;&#xA;[2] Product: WBT&#xD;&#xA;IP Address: 157.237.14.100&#xD;&#xA;Subnet mask: 255.255.0.0&#xD;&#xA;Default gateway: 157.237.14.1&#xD;&#xA;Serial number: 743368&#xD;&#xA;Embedded software: Rev. 2.20&#xD;&#xA;FPGA TX firmware: Rev. 5&#xD;&#xA;FPGA RX firmware: Rev. 7&#xD;&#xA;CH1: 496W CH2: 488W CH3: 478W CH4: 488W&#xD;&#xA;TRD1: &#xD;&#xA;TRD2: Unable to detect transducer&#xD;&#xA;TRD3: Unable to detect transducer&#xD;&#xA;TRD4: Unable to detect transducer&#xD;&#xA;" TransceiverSoftwareVersion="2.20" TransceiverNumber="2" MarketSegment="Fishery" TransceiverType="WBT" SerialNumber="743368" Impedance="5400" Multiplexing="0" RxSampleFrequency="1500000">
      <Channels>
        <Channel ChannelID="WBT 743368-7 ES38-18|200-18C" ChannelIdShort="Breiður geisli 18° - 38-18" MaxTxPowerTransceiver="1500" PulseDuration="0.000256;0.000512;0.001024;0.002048;0.004096" PulseDurationFM="0.000512;0.001024;0.002048;0.004096;0.008192" HWChannelConfiguration="7">
          <Transducer TransducerName="ES38-18|200-18C" ArticleNumber="398445" SerialNumber="0" Frequency="38000" FrequencyMinimum="34000" FrequencyMaximum="43000" BeamType="17" EquivalentBeamAngle="-12.5" Gain="18;18;18;18;18" SaCorrection="0;0;0;0;0" MaxTxPowerTransducer="500" BeamWidthAlongship="17.1" BeamWidthAthwartship="17.1" AngleSensitivityAlongship="10.5" AngleSensitivityAthwartship="10.5" AngleOffsetAlongship="0" AngleOffsetAthwartship="0" DirectivityDropAt2XBeamWidth="0" />
        </Channel>
        <Channel ChannelID="WBT 743368-8 ES38-18|200-18C" ChannelIdShort="Breiður geisli 18° - 200-18C" MaxTxPowerTransceiver="500" PulseDuration="6.4E-05;0.000128;0.000256;0.000512;0.001024" PulseDurationFM="0.000512;0.001024;0.002048;0.004096;0.008192" HWChannelConfiguration="8">
          <Transducer TransducerName="ES38-18|200-18C" ArticleNumber="398445" SerialNumber="0" Frequency="200000" FrequencyMinimum="190000" FrequencyMaximum="220000" BeamType="0" EquivalentBeamAngle="-12.6" Gain="18.7;18.7;18.7;18.7;18.7" SaCorrection="0;0;0;0;0" MaxTxPowerTransducer="250" BeamWidthAlongship="17.3" BeamWidthAthwartship="16.9" AngleSensitivityAlongship="0" AngleSensitivityAthwartship="0" AngleOffsetAlongship="0" AngleOffsetAthwartship="0" DirectivityDropAt2XBeamWidth="0" />
        </Channel>
      </Channels>
    </Transceiver>
  </Transceivers>

  <Transducers MergeOperation="AddNodeTree">
    <Transducer TransducerName="ES38B" TransducerMounting="HullMounted" TransducerCustomName="Gamli ES60 mjor geisli" TransducerSerialNumber="0" TransducerOrientation="Vertical" TransducerOffsetX="0" TransducerOffsetY="0" TransducerOffsetZ="0" TransducerAlphaX="0" TransducerAlphaY="0" TransducerAlphaZ="0" />
    <Transducer TransducerName="ES38-18|200-18C" TransducerMounting="HullMounted" TransducerCustomName="Breiður geisli 18°" TransducerSerialNumber="0" TransducerOrientation="Vertical" TransducerOffsetX="0" TransducerOffsetY="0" TransducerOffsetZ="0" TransducerAlphaX="0" TransducerAlphaY="0" TransducerAlphaZ="0" />
  </Transducers>

  <ConfiguredSensors MergeOperation="AddNodeTree">
    <Sensor Name="GPS From Serial Port 7" Type="GPS" Port="Serial Port 7" TalkerID="" X="0" Y="0" Z="0" AngleX="0" AngleY="0" AngleZ="0" Unique="0" Timeout="20">
      <Telegram Name="GLL from GPS From Serial Port 7" SensorType="GPS" Type="GLL" SubscriptionPath="GPS From Serial Port 7@GPS.Geographical.Position" Enabled="1">
        <Value Name="Latitude" Priority="1" />
        <Value Name="Longitude" Priority="1" />
      </Telegram>
      <Telegram Name="GGA from GPS From Serial Port 7" SensorType="GPS" Type="GGA" SubscriptionPath="GPS From Serial Port 7@GPS.Global.Position" Enabled="1">
        <Value Name="Latitude" Priority="2" />
        <Value Name="Longitude" Priority="2" />
      </Telegram>
      <Telegram Name="RMC from GPS From Serial Port 7" SensorType="GPS" Type="RMC" SubscriptionPath="GPS From Serial Port 7@GPS.Specific.PositionSpeedCourse" Enabled="1">
        <Value Name="Latitude" Priority="3" />
        <Value Name="Longitude" Priority="3" />
        <Value Name="Course" Priority="1" />
        <Value Name="Speed" Priority="1" />
      </Telegram>
      <Telegram Name="GGK from GPS From Serial Port 7" SensorType="GPS" Type="GGK" SubscriptionPath="GPS From Serial Port 7@GPS.GGK.Position" Enabled="1">
        <Value Name="Latitude" Priority="4" />
        <Value Name="Longitude" Priority="4" />
      </Telegram>
      <Telegram Name="VTG from GPS From Serial Port 7" SensorType="GPS" Type="VTG" SubscriptionPath="GPS From Serial Port 7@GPS.Ground" Enabled="1">
        <Value Name="Course" Priority="2" />
        <Value Name="CourseNotUsedMagnetic" Priority="1" />
        <Value Name="Speed" Priority="2" />
      </Telegram>
      <Telegram Name="ZDA from GPS From Serial Port 7" SensorType="GPS" Type="ZDA" SubscriptionPath="GPS From Serial Port 7@GPS.TimeInfo" Enabled="1">
        <Value Name="TimeInfo" Priority="1" />
      </Telegram>
    </Sensor>
    <Sensor Name="ITI-FS From Serial Port 6" Type="ITI-FS" Port="Serial Port 6" TalkerID="II" X="0" Y="0" Z="0" AngleX="0" AngleY="0" AngleZ="0" Unique="0" Timeout="20">
      <Telegram Name="ITI-FS Datagrams from ITI-FS From Serial Port 6" SensorType="ITI-FS" Type="ITI-FS Datagrams" SubscriptionPath="ITI-FS From Serial Port 6@ITI-FS.ITI-FS" Enabled="1">
        <Value Name="ITI-FS" Priority="1" />
      </Telegram>
    </Sensor>
  </ConfiguredSensors>
</Configuration>

`;

    watch.on('stateChange', function({state, prevState, attempt, timeoutMs}) {
      console.log('\nSTATE', state, prevState, attempt);

      try {
        switch (attempt) {
          case 2:
            assert.strictEqual(state, 'online');
            // creating file
            Simulator.sync(path.join(rawDataFolder, 'testfile.raw'), {content, once: true});
            assertions++;

            break;
        }
      } catch (err) {
        watch.close().then(_ => done(err));
      }
    });
  });
});
