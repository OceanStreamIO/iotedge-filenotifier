module.exports = class Parser {
  static shouldProcess(Events, type) {
    return Object.keys(Events).includes(type);
  }

  get description() {
    return 'echosounder';
  }

  get type() {
    return 'simrad_es70_metadata';
  }

  async processFile(data) {
    return data;
  }
};
