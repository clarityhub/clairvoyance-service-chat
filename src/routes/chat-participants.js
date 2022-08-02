const versionRouter = require('express-version-route');
const { weakAuthMiddleware } = require('service-claire/middleware/auth');
const { fullUserMiddleware } = require('service-claire/middleware/user');
const pubsubMiddleware = require('service-claire/middleware/publish');
const makeMap = require('service-claire/helpers/makeMap');
const cors = require('cors');

const v1_0 = require('../v1_0/controllers/participants');
const { createPublishChat } = require('../v1_0/publications');

const pubsubChatMiddleware = pubsubMiddleware(createPublishChat);

module.exports = (router) => {
  router.route('/:uuid/participants')
    .options(cors())
    .get(
      weakAuthMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.getParticipants,
        default: v1_0.getParticipants,
      }))
    );

  router.route('/:uuid/join')
    .options(cors())
    .post(
      cors(),
      weakAuthMiddleware,
      pubsubChatMiddleware,
      fullUserMiddleware,
      versionRouter.route(makeMap({
        '1.0': v1_0.join,
        default: v1_0.join,
      }))
    );
};
