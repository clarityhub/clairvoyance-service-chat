module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(
      'ChatParticipants',
      {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },
        ChatId: {
          type: Sequelize.BIGINT,
        },
        ParticipantId: {
          type: Sequelize.BIGINT,
        },
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE,
        deletedAt: Sequelize.DATE,
      }
    );
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('ChatParticipants');
  },
};
