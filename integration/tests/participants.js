const chai = require('chai');

const { expect } = chai;

const InjectInterface = require('service-claire/test/helpers/inject');
const { createToken } = require('service-claire/helpers/tokens');
const { createForgery } = require('service-claire/test/helpers/forgery');
const { createConnection } = require('service-claire/services/pubsub');
const { subscribe, unsubscribe } = require('service-claire/rpc/listen');
const { CHAT_UPDATED, PARTICIPANT_JOINED } = require('service-claire/events');

const chatSeeds = require('../../seeders/20170625214520825-create-chats');

const chatRoomUuid = '32fd8b05-75e6-4246-aef5-bbb619191693';

const { app } = require('../../src/index');

describe('Participants 1.0', () => {
  beforeEach((done) => {
    InjectInterface(chatSeeds.down).then(() => {
      return InjectInterface(chatSeeds.up).then(() => done());
    }).catch(done);
  });

  describe('POST chats/:id/join', () => {
    before(() => {
      subscribe('getUser', () => ({
        name: 'Test',
        email: 'test@test@gmail.com',
      }));
    });

    after(() => {
      unsubscribe('getUser');
    });

    it('a user can join a chat', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '1',
      });

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/join`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');

          expect(resp.body.chat.uuid).to.not.be.empty;
          done();
        });
    });

    it('returns not found for client jwts', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/join`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it('returns forbidden for invalid jwts', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      const forgery = createForgery(token);

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/join`)
        .set({
          'X-Api-Version': '1.0',
          token: forgery,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(403);

          done();
        });
    });

    it('sends an event to rabbitmq that a user joined a chat', (done) => {
      const exchange = 'test.chats';
      let connection;

      createConnection().then((c) => {
        connection = c;
        return c.createChannel();
      }).then((ch) => {
        return ch.assertExchange(exchange, 'fanout', { durable: false }).then(() => {
          return ch.assertQueue('', { exclusive: true }).then((q) => {
            ch.bindQueue(q.queue, exchange, '');

            ch.consume(q.queue, (msg) => {
              const message = msg.content.toString();

              if (message.indexOf(CHAT_UPDATED) === -1) {
                expect(message).to.be.not.empty;
                expect(message).to.contain(PARTICIPANT_JOINED);
                expect(message).to.contain('chatId');
                expect(message).to.contain('uuid');

                ch.close();
                connection.close();

                done();
              }
            }, { noAck: true });

            const token = createToken({
              userId: '1',
              accountId: '1',
            });

            chai.request(app)
              .post(`/chats/${chatRoomUuid}/join`)
              .set({
                'X-Api-Version': '1.0',
                token,
              })
              .send({})
              .end(() => {
                // Do nothing
              });
          });
        });
      }).catch(done);
    });
  });

  describe('GET /chats/:id/participants', () => {
    it('responds with the participants for client jwts', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/participants`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(200);

          expect(resp.body.participants).to.be.length(2);
          expect(resp.body.participants[0].uuid).to.not.be.empty;
          expect(resp.body.participants[1].uuid).to.not.be.empty;

          done();
        });
    });

    it('responds with the participants for user in org jwts', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/participants`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(200);

          expect(resp.body.participants).to.be.length(2);
          expect(resp.body.participants[0].uuid).to.not.be.empty;
          expect(resp.body.participants[1].uuid).to.not.be.empty;

          done();
        });
    });

    it('responds with not found for client in another room', (done) => {
      const token = createToken({
        clientId: '10',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/participants`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it('responds with not found for user in another org', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '2',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/participants`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it('responds with fobidden for invalid jwt tokens', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      const forgery = createForgery(token);

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/participants`)
        .set({
          'X-Api-Version': '1.0',
          token: forgery,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(403);

          done();
        });
    });
  });

  describe('PUBSUB participants', () => {
    it.skip('updates the name and email of a participant', (done) => {
      done({ error: 'not implemented' });
    });
  });
});
