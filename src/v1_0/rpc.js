const { subscribe, unsubscribe } = require('service-claire/rpc/listen');
const { getChatPromise } = require('./controllers/chat');

subscribe('getChat', (data) => {
  const { meta } = data;

  const { chatUuid, accountId } = meta;

  if (chatUuid) {
    return getChatPromise(chatUuid, accountId);
  }
  return {
    type: 'error',
    reason: 'Unsupported type',
  };
});

process.on('exit', () => {
  unsubscribe('getChat');
});
