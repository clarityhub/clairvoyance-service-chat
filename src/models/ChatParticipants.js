module.exports = function (sequelize, Sequelize) {
  const ChatParticipants = sequelize.define('ChatParticipants', {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
    deletedAt: Sequelize.DATE,
  }, {
    timestamps: true,
    paranoid: true,
  });

  return ChatParticipants;
};
