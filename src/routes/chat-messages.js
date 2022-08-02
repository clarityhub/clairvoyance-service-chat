const versionRouter = require('express-version-route');
const { weakAuthMiddleware, integrationMiddleware } = require('service-claire/middleware/auth');
const pubsubMiddleware = require('service-claire/middleware/publish');
const { billingAccountMiddleware } = require('service-claire/middleware/billing');
const makeMap = require('service-claire/helpers/makeMap');
const cors = require('cors');
const { MESSAGE_READ, MESSAGE_CREATE } = require('service-claire/scopes');

const v1_0 = require('../v1_0/controllers/messages');
const { createPublishChat } = require('../v1_0/publications');

const pubsubChatMiddleware = pubsubMiddleware(createPublishChat);

module.exports = (router) => {
  router.route('/:uuid/msgs')
    .options(cors())
    .get(
      cors(),
      integrationMiddleware(MESSAGE_READ),
      weakAuthMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.getMessages,
        default: v1_0.getMessages,
      }))
    )
    .post(
      cors(),
      integrationMiddleware(MESSAGE_CREATE),
      weakAuthMiddleware,
      pubsubChatMiddleware,
      billingAccountMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.createMessage,
        default: v1_0.createMessage,
      }))
    );
};
