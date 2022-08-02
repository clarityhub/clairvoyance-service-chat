module.exports = {
  up(queryInterface) {
    return queryInterface.bulkInsert('Participants', [{
      uuid: '32fd8b05-75e6-4246-aef5-bbb619191692',
      accountId: '1',
      realId: '2',
      realType: 'client',
    }, {
      uuid: '32fd8b05-75e6-4246-aef5-bbb619191693',
      accountId: '1',
      realId: '1',
      realType: 'user',
    }, {
      uuid: '32fd8b05-75e6-4246-aef5-bbb619191694',
      accountId: '1',
      realId: '4',
      realType: 'user',
    }], { returning: true }).then((participants) => {
      return queryInterface.bulkInsert('Chats', [{
        accountId: '1',
        participantId: participants[0].uuid,
        uuid: '32fd8b05-75e6-4246-aef5-bbb619191693',
      }], { returning: true }).then((chats) => {
        return queryInterface.bulkInsert('ChatParticipants', [{
          ChatId: chats[0].id,
          ParticipantId: participants[0].id,
        }, {
          ChatId: chats[0].id,
          ParticipantId: participants[1].id,
        }]).then(() => {
          return queryInterface.bulkInsert('Messages', [{
            ChatId: chats[0].id,
            accountId: '1',
            text: 'Wowzza 1',
            participantId: participants[0].id,
            uuid: '311f2629-8f2e-4d4f-bcde-0266901f1f60',
            createdAt: new Date(),
          }, {
            ChatId: chats[0].id,
            accountId: '1',
            text: 'Wowzza 2',
            participantId: participants[1].id,
            uuid: '37402070-64a8-4fbf-a910-b63b635c0078',
            createdAt: new Date(),
          }]);
        });
      });
    });
  },

  down(queryInterface) {
    return queryInterface.bulkDelete('Chats', null, {}).then(() => {
      return queryInterface.bulkDelete('Participants', null, {});
    }).then(() => {
      return queryInterface.bulkDelete('ChatParticipants', null, {});
    }).then(() => {
      return queryInterface.bulkDelete('Messages', null, {});
    });
  },
};
