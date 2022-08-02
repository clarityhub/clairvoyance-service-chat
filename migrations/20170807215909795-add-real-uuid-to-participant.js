module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Participants',
      'realUuid',
      {
        type: Sequelize.UUID,
        validate: {
          notEmpty: true,
        },
      }
    );
  },
  down: (queryInterface) => {
    return queryInterface.removeColumn(
      'Participants',
      'realUuid'
    );
  },
};
