module.exports = {
  up: (queryInterface) => {
    return queryInterface.renameColumn(
      'Chats',
      'orgId',
      'accountId'
    ).then(() => {
      return queryInterface.renameColumn(
        'Messages',
        'orgId',
        'accountId'
      );
    }).then(() => {
      return queryInterface.renameColumn(
        'Participants',
        'orgId',
        'accountId'
      );
    });
  },
  down: (queryInterface) => {
    return queryInterface.renameColumn(
      'Chats',
      'accountId',
      'orgId'
    ).then(() => {
      return queryInterface.renameColumn(
        'Messages',
        'accountId',
        'orgId'
      );
    }).then(() => {
      return queryInterface.renameColumn(
        'Participants',
        'accountId',
        'orgId'
      );
    });
  },
};
