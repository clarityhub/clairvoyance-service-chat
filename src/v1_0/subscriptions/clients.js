const { fanoutQueue } = require('service-claire/services/pubsub');
const { CLIENT_UPDATED } = require('service-claire/events');
const pubsubMiddleware = require('service-claire/middleware/publish');
const { updateParticipantPromise } = require('../controllers/participants');
const { createPublishChat } = require('../publications');

const exchange = `${process.env.NODE_ENV || 'development'}.clients`;

const pubsubChatMiddleware = pubsubMiddleware(createPublishChat);
const req = {};

pubsubChatMiddleware(req, {}, () => {});

module.exports = () => {
  fanoutQueue(exchange, 'service-chat', (message) => {
    switch (message.event) {
      case CLIENT_UPDATED:
        return updateParticipantPromise(message, req.services.publish);
      default:
      // Do nothing
    }
  });
};
