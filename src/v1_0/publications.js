const logger = require('service-claire/helpers/logger');

let channelPromise;

const exchange = `${process.env.NODE_ENV || 'development'}.chats`;

const createPublishChat = (connection) => {
  if (!channelPromise) {
    channelPromise = new Promise((resolve, reject) => {
      connection.then((c) => {
        return c.createChannel();
      }).then((ch) => {
        return ch.assertExchange(exchange, 'fanout', { durable: false }).then(() => {
          resolve(ch);
        });
      }).catch((err) => {
        logger.error(err);
        reject(err);
      });
    });
  }

  return (data) => {
    channelPromise.then(channel => channel.publish(exchange, '', Buffer.from(JSON.stringify(data))));
  };
};

module.exports = {
  createPublishChat,
};
