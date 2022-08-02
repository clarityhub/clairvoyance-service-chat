const chatStatuses = require('../enums/chatStatuses');

module.exports = function (sequelize, Sequelize) {
  const Chat = sequelize.define('Chat', {
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
      type: Sequelize.ENUM(chatStatuses.toArray()),
      defaultValue: chatStatuses.OPEN,
      validate: {
        notEmpty: true,
      },
    },

    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
    deletedAt: Sequelize.DATE,
  }, {
    timestamps: true,
    paranoid: true,
  });

  Chat.cleanAttributes = ['uuid', 'accountId', 'participantId', 'status', 'createdAt', 'updatedAt'];

  Chat.findWhereParticipant = ({
    clientId,
    userId,
    uuid,
    accountId,
  }) => {
    return Chat.sequelize.query(
      `
  SELECT "Chat".*,
         "Participants"."id"                              AS "Participants.id",
         "Participants"."uuid"                            AS "Participants.uuid",
         "Participants"."accountId"                           AS "Participants.accountId",
         "Participants"."realId"                          AS "Participants.realId",
         "Participants"."realType"                        AS "Participants.realType",
         "Participants"."name"                            AS "Participants.name",
         "Participants"."email"                           AS "Participants.email",
         "Participants"."createdAt"                       AS "Participants.createdAt",
         "Participants"."updatedAt"                       AS "Participants.updatedAt",
         "Participants"."deletedAt"                       AS "Participants.deletedAt",
         "Participants->ChatParticipants"."id"            AS "Participants.ChatParticipants.id",
         "Participants->ChatParticipants"."createdAt"     AS "Participants.ChatParticipants.createdAt",
         "Participants->ChatParticipants"."updatedAt"     AS "Participants.ChatParticipants.updatedAt",
         "Participants->ChatParticipants"."deletedAt"     AS "Participants.ChatParticipants.deletedAt",
         "Participants->ChatParticipants"."ChatId"        AS "Participants.ChatParticipants.ChatId",
         "Participants->ChatParticipants"."ParticipantId" AS "Participants.ChatParticipants.ParticipantId"
  FROM   (SELECT "Chat"."id",
                 "Chat"."uuid",
                 "Chat"."accountId",
                 "Chat"."participantId",
                 "Chat"."status",
                 "Chat"."createdAt",
                 "Chat"."updatedAt",
                 "Chat"."deletedAt"
          FROM   "Chats" AS "Chat"
          WHERE  ( ( "Chat"."deletedAt" > CURRENT_TIMESTAMP
                      OR "Chat"."deletedAt" IS NULL )
                   AND ( "Chat"."uuid" = :uuid
                         AND "Chat"."accountId" = :accountId ) )
          LIMIT  1) AS "Chat"
         INNER JOIN ( "ChatParticipants" AS "Participants->ChatParticipants"
                           INNER JOIN "Participants" AS "Participants"
                                   ON "Participants"."id" = "Participants->ChatParticipants"."ParticipantId"
                                      AND ( ( "Participants->ChatParticipants"."deletedAt" > CURRENT_TIMESTAMP
                                               OR "Participants->ChatParticipants"."deletedAt" IS NULL )
                                            AND ( ( "Participants"."realId" = :clientId
                                                    AND "Participants"."realType" = 'client' )
                                                   OR ( "Participants"."realId" = :userId
                                                        AND "Participants"."realType" = 'user' ) ) ))
                      ON "Chat"."id" = "Participants->ChatParticipants"."ChatId"
                         AND ( "Participants"."deletedAt" > CURRENT_TIMESTAMP
                                OR "Participants"."deletedAt" IS NULL )
  `,
      {
        replacements: {
          clientId: clientId || null,
          userId: userId || null,
          uuid,
          accountId,
        },
        type: Chat.sequelize.QueryTypes.SELECT,
        logging: false,
        model: Chat,
      }
    ).then(res => res);
  };

  return Chat;
};
