const versionRouter = require('express-version-route');
const authMiddleware = require('service-claire/middleware/auth');
const { fullUserMiddleware } = require('service-claire/middleware/user');
const pubsubMiddleware = require('service-claire/middleware/publish');
const { billingAccountMiddleware } = require('service-claire/middleware/billing');
const { integrationMiddleware } = require('service-claire/middleware/auth');
const { MESSAGE_COMPOSE } = require('service-claire/scopes');
const makeMap = require('service-claire/helpers/makeMap');
const cors = require('cors');

const v1_0 = require('../v1_0/controllers/chat');
const v1_0Messages = require('../v1_0/controllers/messages');
const { createPublishChat } = require('../v1_0/publications');

const { weakAuthMiddleware } = authMiddleware;
const pubsubChatMiddleware = pubsubMiddleware(createPublishChat);

module.exports = (router) => {
  router.route('/')
    .options(cors())
    .get(
      cors(),
      authMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.getChats,
        default: v1_0.getChats,
      }))
    )
    .post(
      cors(),
      weakAuthMiddleware,
      pubsubChatMiddleware,
      fullUserMiddleware,
      billingAccountMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.createChat,
        default: v1_0.createChat,
      }))
    );

  router.route('/:uuid/compose')
    .options(cors())
    .post(
      // TODO rate limiting
      integrationMiddleware(MESSAGE_COMPOSE),
      authMiddleware,
      pubsubChatMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0Messages.composeMessage,
        default: v1_0Messages.composeMessage,
      }))
    );

  router.route('/:uuid')
    .options(cors())
    .get(
      cors(),
      weakAuthMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.getChat,
        default: v1_0.getChat,
      }))
    )
    .put(
      cors(),
      weakAuthMiddleware,
      pubsubChatMiddleware,
      fullUserMiddleware,
      billingAccountMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.updateChat,
        default: v1_0.updateChat,
      }))
    );


  // XXX DELETE chats/:uuid
};
