# @oceanstream/filenotifier 

File and directory notifier module for [OceanStream](https://oceanstream) data platform based on the Azure IoT Edge framework.

## Description

The primary objective of the FileNotifier module is to:

1. monitor specified folders for any file activities, specified by extension (by default `.raw` data files);
2. dispatch state changes related to file and folder activities to the OceanStream platform for further processing and alerting;
3. serve as a source of metadata and other relevant information related to the equipment operation.

## Parameters

| Parameter                | Description                                                                                                   | Default Value         | Data Type   |
|--------------------------|---------------------------------------------------------------------------------------------------------------|-----------------------|-------------|
| `RAW_DATA_FOLDER`        | Specifies the directory to monitor for `.raw` data files.                                                      | `/app/tmpdata`        | String      |
| `alertTimeDiff`          | Time in milliseconds to wait until changing the state to ALARM if no file activity is detected.                | `120000` ms (2 mins)  | Number      |
| `logLevel`               | Sets the verbosity level for logging. Possible values: `'debug'`, `'info'`, `'warn'`, `'error'`.               | `debug`               | String      |
| `logFormat`              | Determines the format of the log, either `json` for structured logs or `text` for plain text logs.             | `text`                | String      |
| `logTimestamp`           | Whether to include timestamps in the log entries.                                                              | `false`               | Boolean     |
| `alertSendingInterval`   | Interval (in custom units defined by `alertSendingIntervalUnit`) between consecutive state update messages.    | `30`                  | Number      |
| `alertSendingIntervalUnit`| Unit of time, in milliseconds, for `alertSendingInterval`.                                                    | `60000` ms (1 min)    | Number      |
| `connectMaxTimeout`      | Maximum timeout, in milliseconds, for status check.                                                            | `90000` ms (1.5 mins) | Number      |
| `connectMinTimeout`      | Minimum timeout, in milliseconds, for status check.                                                            | `100` ms              | Number      |
| `filePollingInterval`    | Interval, in milliseconds, at which the `chokidar` library checks for file or folder changes.                  | `10000` ms (10 secs)  | Number      |
| `continuousProcessing`   | Flag to indicate whether files should be processed continuously or not.                                        | `false`               | Boolean     |
| `enableRawFileProcessing`| Flag to control whether to send raw files for further processing or not.                                       | `true`                | Boolean     |
| `fileWatchThreshold`     | Time duration, in milliseconds, to watch for changes before raising an event.                                  | `10000` ms (10 secs)  | Number      |

