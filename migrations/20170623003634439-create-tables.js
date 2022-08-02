module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(
      'Chats',
      {
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

        orgId: {
          type: Sequelize.STRING,
          validate: {
            notEmpty: true,
          },
        },

        participantId: {
          type: Sequelize.UUID,
          validate: {
            notEmpty: true,
          },
        },

        status: {
          type: Sequelize.ENUM('open', 'closed'),
          defaultValue: 'open',
          validate: {
            notEmpty: true,
          },
        },

        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE,
        deletedAt: Sequelize.DATE,
      }
    ).then(() => {
      return queryInterface.createTable(
        'Messages',
        {
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

          orgId: {
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
        }
      );
    }).then(() => {
      return queryInterface.createTable(
        'Participants',
        {
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

          orgId: {
            type: Sequelize.BIGINT,
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
            // TODO use constants
            type: Sequelize.ENUM('user', 'client'),
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
        }
      );
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('Chats').then(() => {
      return queryInterface.dropTable('Messages');
    }).then(() => {
      return queryInterface.dropTable('Participants');
    });
  },
};
