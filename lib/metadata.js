const fs = require('fs');
const Events = require('events');
const {parseString} = require('xml2js');

const configurationRegex = /<Configuration>(.+)<\/Configuration>/s;
module.exports = class Metadata extends Events {

  constructor() {
    super();

    this.data = {
      Transducers: null,
      Transceivers: null
    };
  }

  add(filename) {
    this.filename = filename;
    this.stream = fs.createReadStream(filename, {encoding: 'utf8'});
    this.stream.on('open', () => {
      console.log(`Stream opened for file: ${filename}`);
    });

    this.stream.on('data', data => {
      let configMatches = data.match(configurationRegex);
      if (configMatches && configMatches[0]) {
        this.stream.close();

        console.log(`Stream closed for file: ${filename}`);

        parseString(configMatches[0], (err, result) => {
          if (err || !result) {
            console.error('Error while parsing file: ' + filename, err);
            return;
          }

          let transceivers;
          let Transducer;

          try {
            const {Configuration = {}} = result;
            const {Transducers, Transceivers} = Configuration;

            if (Transducers && Transducers.length >= 1) {
              Transducer = Transducers[0].Transducer;
              this.data.Transducers = Transducer.map(item => item.$);
            } else {
              this.data.Transducers = [];
            }

            if (Transceivers && Transceivers.length >= 1) {
              transceivers = Transceivers[0].Transceiver;
              this.data.Transceivers = transceivers.reduce((prev, item) => {
                const transceiver = Object.assign({}, item.$);
                if (transceiver.Version) {
                  delete transceiver.Version;
                }

                transceiver.Channels = [];

                item.Channels[0].Channel.forEach((channel, i) => {
                  const channelEntry = Object.assign({}, channel.$);
                  channelEntry.Transducer = channel.Transducer[0].$;

                  transceiver.Channels.push(channelEntry);
                });

                prev.push(transceiver);

                return prev;
              }, []);
            } else {
              this.data.Transceivers = [];
            }
          } catch (err) {
            console.error('Metadata parse error:', err);

            this.data.Transceivers = [];
            this.data.Transducers = [];
          }


          this.emit('data', this.data);
        });
      }
    });
  }
};
