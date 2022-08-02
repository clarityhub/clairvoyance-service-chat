const pick = require('lodash/pick');
const { ok, error, notFound } = require('service-claire/helpers/responses');
const logger = require('service-claire/helpers/logger');
const { MESSAGE_CREATED, MESSAGE_COMPOSED } = require('service-claire/events');
const {
  CLIENT,
  USER,
} = require('../../enums/participantTypes');
const {
  Chat,
  Message,
  Participant,
} = require('../../models');

const getMessages = (req, res) => {
  const DEFAULT_PAGE_SIZE = 20;
  const { clientId, userId, accountId } = req.user;
  const { uuid } = req.params;
  const { fromDate: fromDateReq } = req.query;
  const fromDate = fromDateReq || (+new Date() + 1000);

  // TODO validate params

  let promise = null;

  if (userId && accountId) {
    promise = Chat.findAll({
      where: {
        uuid,
        accountId,
      },
    }, {
      logging: false,
    });
  } else {
    promise = Participant.findOne({
      where: {
        realType: clientId ? CLIENT : USER,
        realId: clientId || userId,
        accountId,
      },
      include: [{
        required: true,
        model: Chat,
        where: {
          uuid,
          accountId,
        },
      }],
    }).then((r) => {
      return Promise.resolve(r ? r.Chats : null);
    });
    // NOTE No catch section, since the promise
    // gets used below
  }

  promise.then((chats) => {
    if (chats === null || typeof chats === 'undefined' || chats.length === 0) {
      return notFound(res)();
    }

    return Chat.findOne({
      where: {
        id: chats[0].id,
      },
      include: [{
        model: Message,
        limit: DEFAULT_PAGE_SIZE + 1,
        where: {
          createdAt: {
            $lt: fromDate,
          },
        },
        order: [
          ['createdAt', 'DESC'],
        ],
      }, {
        model: Participant,
      }],
    }).then((chat) => {
      const hasNextPage = chat.Messages.length > DEFAULT_PAGE_SIZE;

      const cleanedMessages = {
        hasNextPage,
        chat: pick(chat, Chat.cleanAttributes),
        messages: chat.Messages.slice(0, DEFAULT_PAGE_SIZE).map((m) => {
          const message = pick(m, Message.cleanAttributes);

          if (m.participantId === '-1') {
            message.participantId = '-1';
          } else {
            message.participantId = chat.Participants.find((p) => {
              return `${p.id}` === `${m.participantId}`;
            }).uuid;
          }

          return message;
        }),
      };

      ok(res)(cleanedMessages);
    });
  }).catch((e) => {
    logger.error(e);
    error(res)(e);
  });
};

// TODO simplify these queries
const createMessage = (req, res) => {
  const { clientId, userId, accountId } = req.user;
  const { uuid } = req.params;
  const { text } = req.body;

  // TODO validate params

  let promise = null;

  if (userId && accountId) {
    promise = Chat.findAll({
      where: {
        uuid,
        accountId,
      },
    }, {
      logging: false,
    });
  } else {
    promise = Participant.findOne({
      where: {
        realType: clientId ? CLIENT : USER,
        realId: clientId || userId,
        accountId,
      },
      include: [{
        required: true,
        model: Chat,
        where: {
          uuid,
          accountId,
        },
      }],
    }).then((r) => {
      return Promise.resolve(r ? r.Chats : null);
    });
    // NOTE no catch statement becuase the promise
    // gets used below
  }

  promise.then((chats) => {
    if (chats === null || typeof chats === 'undefined' || chats.length === 0) {
      return notFound(res)();
    }

    const chat = chats[0];

    return Chat.findOne({
      where: {
        id: chat.id,
      },
      include: [{
        model: Participant,
        where: {
          realId: userId || clientId,
          realType: userId ? USER : CLIENT,
        },
      }],
    }).then((c) => {
      if (!c) {
        notFound(res)({});
        return null;
      }

      const participant = c.Participants[0];

      if (participant && participant.id) {
        return Message.create({
          text,
          participantId: participant.id,
          accountId,
          ChatId: chat.id,
        }, {
          returning: true,
        }).then((message) => {
          return chat.getParticipants().then((participants) => {
            const cleanedMessage = pick(message, Message.cleanAttributes);
            const raw = message.get({ plain: true });
            raw.Chat = chat.get({ plain: true });
            raw.Chat.Participants = participants.map(p => p.get({ plain: true }));

            const clean = cleanedMessage;
            clean.participantId = participant.uuid;
            clean.participantType = participant.realType;
            clean.chatUuid = chat.uuid;


            ok(res)(clean);

            // Send message
            req.services.publish({
              event: MESSAGE_CREATED,
              ts: new Date(),
              meta: {
                raw,
                clean,
              },
            });
          }).catch((err) => {
            logger.error(err);
          });
        });
      }
      notFound(res)();
    });
  }).catch((e) => {
    logger.error(e);
    error(res)(e);
  });
};

const composeMessage = (req, res) => {
  const { uuid } = req.params;
  const { accountId, userId } = req.user;
  const { text } = req.body;

  req.services.publish({
    event: MESSAGE_COMPOSED,
    ts: new Date(),
    meta: {
      raw: {
        userId,
        accountId,
      },
      clean: {
        chatUuid: uuid,
        text,
      },
    },
  });

  ok(res)({});
};

module.exports = {
  getMessages,
  createMessage,
  composeMessage,
};
