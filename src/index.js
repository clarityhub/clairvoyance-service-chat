const express = require('express');
const bodyParser = require('body-parser');

const limits = require('./rate-limits');
const routes = require('./routes/index');
require('./v1_0/subscriptions');
require('./v1_0/rpc');
const { settings } = require('service-claire/helpers/config');
const helmet = require('service-claire/middleware/helmet');
const errorHandler = require('service-claire/middleware/errors');
const logger = require('service-claire/helpers/logger');

logger.register('ebf12f15b05d75d5bb779b7bdcbb4460');

const app = express();

app.enable('trust proxy');
app.use(helmet());
app.use(bodyParser.json());
app.use(limits);
app.use('/chats', routes);
app.use(errorHandler);

const server = app.listen(
  settings.port,
  () => logger.log(`✅ 💬 service-chat running on port ${settings.port}`)
);

module.exports = { app, server }; // For testing
