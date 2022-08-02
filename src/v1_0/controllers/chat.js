const pick = require('lodash/pick');
const { ok, error, notFound } = require('service-claire/helpers/responses');
const logger = require('service-claire/helpers/logger');
const {
  CHAT_CREATED,
  CHAT_UPDATED,
  MESSAGE_CREATED,
} = require('service-claire/events');
const {
  CLIENT,
} = require('../../enums/participantTypes');
const {
  Participant,
  Chat,
  Message,
} = require('../../models');

const createChat = (req, res) => {
  const { uuid, clientId, accountId } = req.user;

  // TODO validate the clientId, validate the accountId

  // TODO create a transaction
  Participant.findOrCreate({
    where: {
      realId: clientId,
      realType: CLIENT,
      accountId,
    },
    defaults: {
      realId: clientId,
      realType: CLIENT,
      realUuid: uuid,
      accountId,
    },
  }).spread((participant) => {
    return Chat.create({
      participantId: participant.uuid,
      accountId,
    }).then((chat) => {
      return chat.addParticipant(participant).then(() => {
        const cleanRoom = pick(chat, Chat.cleanAttributes);

        cleanRoom.participants = [
          pick(participant, Participant.cleanAttributes),
        ];

        const raw = chat.get({ plain: true });
        raw.participants = [participant.get({ plain: true })];

        // send a message to the pubsub
        req.services.publish({
          event: CHAT_CREATED,
          ts: new Date(),
          meta: {
            raw,
            clean: cleanRoom,
          },
        });

        ok(res)(cleanRoom);
      });
    });
  }).catch((err) => {
    logger.error(err);
    error(res)(err);
  });
};

const getChats = (req, res) => {
  const { accountId } = req.user;

  // TODO add filters
  // TODO add paging

  Chat.findAll({
    where: {
      accountId,
    },
    include: [
      {
        model: Participant,
        required: false,
      },
      {
        model: Message,
        required: false,
        order: [
          [
            'createdAt',
            'DESC',
          ],
        ],
        limit: 1,
      },
    ],
  }).then((chats) => {
    if (chats && chats instanceof Array) {
      const clean = chats.map((chat) => {
        const cleanChat = pick(chat, Chat.cleanAttributes);
        cleanChat.participants = chat.Participants.map((p) => {
          return pick(p, Participant.cleanAttributes);
        });
        if (chat.Messages[0]) {
          cleanChat.latestMessage = pick(chat.Messages[0], Message.cleanAttributes);
          const participant = chat.Participants.find((chatParticipant) => {
            return chatParticipant.id === chat.Messages[0].participantId;
          });
          // there's a pretty good chance that if you didn't find the participant
          // it was a system message
          cleanChat.latestMessage.participantId = participant ? participant.uuid : '-1';
        }
        return cleanChat;
      });

      ok(res)({
        count: clean.length,
        chats: clean,
      });
    } else {
      // No chats found
      ok(res)({
        count: 0,
        chats: [],
      });
    }
  }).catch((err) => {
    logger.error(err);
    error(res)(err);
  });
};

const getChat = (req, res) => {
  const { clientId, accountId, userId } = req.user;
  const { uuid } = req.params;

  // TODO validate uuid
  // TODO validate clientId or userId
  // TODO validate accountId
  const respondWithChat = (chat) => {
    const cleanRoom = pick(chat, Chat.cleanAttributes);

    cleanRoom.participants = chat.Participants.map((p) => {
      return pick(p, Participant.cleanAttributes);
    });

    ok(res)(cleanRoom);
  };

  if (userId) {
    // TODO filter by only active chats
    Chat.find({
      where: {
        uuid,
        accountId,
      },
      include: [{
        model: Participant,
        through: {
          where: {},
        },
      }],
    }).then(respondWithChat)
      .catch((err) => {
        logger.error(err);
        error(res)(err);
      });
  } else if (clientId) {
    // Find a chat that also has the user
    Chat.findWhereParticipant({
      clientId,
      uuid,
      accountId,
    }).then((chats) => {
      if (chats.length === 0) {
        return notFound(res)();
      }

      // TODO filter by only active chats
      return Chat.find({
        where: {
          id: chats[0].id,
        },
        include: [{
          model: Participant,
          through: {
            where: {},
          },
        }],
      }).then(respondWithChat);
    }).catch((err) => {
      logger.error(err);
      error(res)(err);
    });
  }
};

// Called from RPC
const getChatPromise = (uuid, accountId) => {
  if (uuid === null) {
    return {
      type: 'error',
      reason: 'Invalid user id',
    };
  }
  const respondWithChat = (chat) => {
    const cleanRoom = pick(chat, Chat.cleanAttributes);

    cleanRoom.participants = chat.Participants.map((p) => {
      return pick(p, [...Participant.cleanAttributes, 'realId', 'accountId']);
    });

    return cleanRoom;
  };

  return Chat.find({
    where: {
      uuid,
      accountId,
    },
    include: [{
      model: Participant,
      through: {
        where: {},
      },
    }],
  }).then(respondWithChat)
    .catch((err) => {
      logger.error(err);
    });
};

const updateChat = (req, res) => {
  const {
    clientId, accountId, userId, name,
  } = req.user;
  const { uuid } = req.params;
  const { status } = req.body;

  // TODO validate uuid
  // TODO validate clientId or userId
  // TODO validate accountId
  // TODO validate status

  if (clientId) {
    notFound(res)();
  } else if (userId) {
    Chat.update({
      status,
    }, {
      where: {
        accountId,
        uuid,
      },
      returning: true,
    }).spread((count, chats) => {
      if (count === 0) {
        return notFound(res)();
      }

      const chat = chats[0];
      const cleanRoom = pick(chats[0], Chat.cleanAttributes);

      // XXX create a message in the chat room that it has been closed

      chat.getParticipants().then((participants) => {
        const raw = chat.get({ plain: true });
        const rawEmit = Object.assign({}, raw); // Object to emit for MESSAGE_CREATED
        const chatParticipants = participants.map(p => p.get({ plain: true }));
        raw.Participants = chatParticipants;

        // send a message to the pubsub
        req.services.publish({
          event: CHAT_UPDATED,
          ts: new Date(),
          meta: {
            raw,
            clean: cleanRoom,
          },
        });

        // format data to send to socket for MESSAGE_CREATED
        rawEmit.Chat = {
          uuid: chat.uuid,
          Participants: chatParticipants,
        };

        Message.create({
          text: `${name} ended the chat`,
          participantId: '-1',
          accountId,
          ChatId: chat.id,
        }, {
          returning: true,
        }).then((message) => {
          const cleanedMessage = pick(message, Message.cleanAttributes);
          // Send message
          req.services.publish({
            event: MESSAGE_CREATED,
            ts: new Date(),
            meta: {
              raw: rawEmit,
              clean: Object.assign({}, cleanedMessage, {
                participantId: '-1',
                participantType: 'system',
                chatUuid: chat.uuid,
              }),
            },
          });
        }).catch(logger.error);
      }).catch((err) => {
        logger.error(err);
      });

      ok(res)(cleanRoom);
    });
  } else {
    notFound(res)();
  }
};

module.exports = {
  createChat,
  getChat,
  getChats,
  updateChat,
  getChatPromise,
};
