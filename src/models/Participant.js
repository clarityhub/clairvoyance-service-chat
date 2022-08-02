const {
  USER,
  CLIENT,
} = require('../enums/participantTypes');

module.exports = function (sequelize, Sequelize) {
  const Participant = sequelize.define('Participant', {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      validate: {
        notEmpty: true,
      },
    },

    accountId: {
      type: Sequelize.BIGINT,
      validate: {
        notEmpty: true,
      },
    },

    realUuid: {
      type: Sequelize.UUID,
      validate: {
        notEmpty: true,
      },
    },
    realId: {
      type: Sequelize.BIGINT,
      validate: {
        notEmpty: true,
      },
    },
    realType: {
      type: Sequelize.ENUM(USER, CLIENT),
      validate: {
        notEmpty: true,
      },
    },

    // Cached values
    name: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },

    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
    deletedAt: Sequelize.DATE,
  }, {
    timestamps: true,
    paranoid: true,
  });

  Participant.cleanAttributes = [
    'uuid',
    // 'accountId',
    'realType',
    'realUuid',
    'name',
    'email',
    'createdAt',
    'updatedAt',
  ];

  Participant.associate = function (models) {
    models.Chat.Participants = models.Chat.belongsToMany(Participant, {
      through: models.ChatParticipants,
    });
    Participant.Chats = Participant.belongsToMany(models.Chat, {
      through: models.ChatParticipants,
    });
  };

  return Participant;
};
