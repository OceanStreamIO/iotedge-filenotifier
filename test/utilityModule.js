const Message = require('azure-iot-device').Message;

let client = undefined;

function printInput(inputName, msg) {
  if (inputName === 'print') {
    const message = msg.getBytes().toString('utf-8');
    console.info(message);
  }
}

async function initModule(client) {
  client.on('inputMessage', (inputName, msg) => {
    client.complete(msg, (err) => {
      if (err) {
        console.error(`Complete message fail with error: ${err.message}`);
      }
    });
    printInput(inputName, msg);
  });
}

async function sendOutputEvent(channel, message) {
  if (!client) {
    throw new Error('Module has not been initialized');
  }

  return await new Promise((resolve, reject) => {
    client.sendOutputEvent(channel, message, (err) => {
      if (err) {
        console.error(`Send message fail: ${err.message}`);
        return reject(new Error(err.toString()));
      }

      console.info('Send message successfully');
      return resolve();
    });
  });
}

function getValidateMessage(requestBody) {
  if (!requestBody) {
    throw new Error('No request body provided');
  }

  const channel = requestBody.inputName;
  if (!channel) {
    throw new Error('Cannot get inputName in request body.');
  }

  const data = requestBody.data;
  if (!data) {
    throw new Error('Cannot find message data in request body');
  }

  const message = new Message(data);
  if (requestBody.properties && typeof requestBody.properties === 'object') {
    const properties = requestBody.properties;
    Object.keys(properties).forEach(property => {
      message.properties.add(property, properties[property]);
    });
  }

  if (requestBody.messageId) {
    message.messageId = requestBody.messageId;
  }

  if (requestBody.correlationId) {
    message.correlationId = requestBody.correlationId;
  }

  if (requestBody.userId) {
    message.userId = requestBody.userId;
  }

  return {channel, message};
}

async function sendMessage(requestBody) {
  const {channel, message} = getValidateMessage(requestBody);
  await this.sendOutputEvent(channel, message);
}

module.exports = {
  initModule,
  sendMessage,
  getValidateMessage,
  sendOutputEvent
};
