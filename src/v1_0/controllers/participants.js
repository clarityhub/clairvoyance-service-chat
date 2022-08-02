const pick = require('lodash/pick');
const { ok, notFound, error } = require('service-claire/helpers/responses');
const logger = require('service-claire/helpers/logger');
const {
  CLIENT_UPDATED,
  CHAT_UPDATED,
  MESSAGE_CREATED,
  PARTICIPANT_JOINED,
  PARTICIPANT_UPDATED,
} = require('service-claire/events');
const ChatStatuses = require('../../enums/chatStatuses');
const {
  USER,
  CLIENT,
} = require('../../enums/participantTypes');
const {
  Chat,
  Message,
  Participant,
} = require('../../models');

const join = async (req, res) => {
  const {
    clientId, userId, accountId, name, email, uuid: realUuid,
  } = req.user;
  const { uuid } = req.params;

  if (clientId) {
    return notFound(res)();
  }

  try {
    const chat = await Chat.findOne({
      where: {
        uuid,
        accountId,
      },
    });

    if (chat === null) {
      return notFound(res)();
    }

    const participant = await chat.createParticipant({
      accountId,
      realId: userId,
      realType: USER,
      realUuid,
      name,
      email,
    }, { returning: true });

    const cleanedParticipant = pick(participant, Participant.cleanAttributes);

    // If this is the first participant
    if (chat.status === ChatStatuses.OPEN) {
      await chat.update({
        status: ChatStatuses.ACTIVE,
      });

      // Send message
      req.services.publish({
        event: CHAT_UPDATED,
        ts: new Date(),
        meta: {
          raw: chat,
          clean: pick(chat, Chat.cleanAttributes),
        },
      });
    }

    // Get participants to send them over MQ
    // Do NOT await
    chat.getParticipants().then((participants) => {
      const raw = participant.get({ plain: true });
      raw.Chat = chat.get({ plain: true });
      raw.Chat.Participants = participants.map(p => p.get({ plain: true }));
      const clean = cleanedParticipant;
      clean.chatId = chat.uuid;
      // Send message
      req.services.publish({
        event: PARTICIPANT_JOINED,
        ts: new Date(),
        meta: {
          raw,
          clean,
        },
      });

      Message.create({
        text: `${name} has joined the room`,
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
            raw,
            clean: Object.assign({}, cleanedMessage, {
              participantId: '-1',
              participantType: 'system',
              chatUuid: chat.uuid,
            }),
          },
        });
      });
    }).catch((err) => {
      logger.error(err);
    });

    ok(res)({
      chat: {
        uuid: chat.uuid,
      },
      participant: cleanedParticipant,
    });
  } catch (err) {
    logger.error(err);
    error(res)(err);
  }
};

const getParticipants = (req, res) => {
  const { clientId, userId, accountId } = req.user;
  const { uuid } = req.params;

  let promise = null;

  if (userId && accountId) {
    promise = Chat.findAll({
      where: {
        uuid,
        accountId,
      },
    });
  } else {
    promise = Chat.findWhereParticipant({
      clientId,
      accountId,
      uuid,
    });
  }

  promise.then((chats) => {
    if (chats.length === 0) {
      return notFound(res)();
    }

    return Chat.findOne({
      where: {
        id: chats[0].id,
      },
      include: [
        {
          model: Participant,
        },
      ],
    }).then((chat) => {
      const cleanParticipants = chat.Participants.map((p) => {
        return pick(p, Participant.cleanAttributes);
      });

      ok(res)({
        participants: cleanParticipants,
      });
    });
  }).catch((err) => {
    logger.error(err);
    error(res)(err);
  });
};

const updateParticipantPromise = (data, publish) => {
  const { raw } = data.meta;

  const type = data.event === CLIENT_UPDATED ? CLIENT : USER;

  return Participant.update({
    name: raw.name,
    email: raw.email,
  }, {
    where: {
      realType: type,
      // TODO double check this
      realId: raw.clientId,
    },
    returning: true,
  }).spread((count, results) => {
    if (count === 0) {
      return;
    }

    const result = results[0];
    const clean = pick(result, Participant.cleanAttributes);

    publish({
      event: PARTICIPANT_UPDATED,
      ts: new Date(),
      meta: {
        raw: result,
        clean,
      },
    });
  });
};

module.exports = {
  join,
  getParticipants,
  updateParticipantPromise,
};
