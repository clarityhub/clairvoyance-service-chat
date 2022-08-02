module.exports = function (sequelize, Sequelize) {
  const Message = sequelize.define('Message', {
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

    ChatId: {
      type: Sequelize.BIGINT,
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

    participantId: {
      type: Sequelize.BIGINT,
      validate: {
        notEmpty: true,
      },
    },

    text: Sequelize.TEXT('long'),

    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
    deletedAt: Sequelize.DATE,
  }, {
    timestamps: true,
    paranoid: true,
  });

  Message.associate = function (models) {
    models.Chat.Messages = models.Chat.hasMany(Message);
    Message.Chat = Message.belongsTo(models.Chat);
  };

  Message.cleanAttributes = [
    'uuid',
    'text',
    'createdAt',
    'updatedAt',
  ];

  return Message;
};
