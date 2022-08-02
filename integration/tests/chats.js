const chai = require('chai');

const { expect } = chai;

const InjectInterface = require('service-claire/test/helpers/inject');
const { createToken } = require('service-claire/helpers/tokens');
const { createForgery } = require('service-claire/test/helpers/forgery');
const { createConnection } = require('service-claire/services/pubsub');
const { subscribe, unsubscribe } = require('service-claire/rpc/listen');
const { CHAT_CREATED, CHAT_UPDATED } = require('service-claire/events');
const chatSeeds = require('../../seeders/20170625214520825-create-chats');

const {
  Participant,
} = require('../../src/models');

const chatRoomUuid = '32fd8b05-75e6-4246-aef5-bbb619191693';

const { app } = require('../../src/index');

describe('Chats 1.0', () => {
  beforeEach((done) => {
    InjectInterface(chatSeeds.down).then(() => {
      return InjectInterface(chatSeeds.up).then(() => done());
    }).catch(done);
  });

  describe('POST /chats', () => {
    before(() => {
      subscribe('getUser', () => ({
        name: 'Test',
        email: 'test@test.com',
      }));
    });

    after(() => {
      unsubscribe('getUser');
    });

    it('creates a room for the client with a participant', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
      });

      chai.request(app)
        .post('/chats')
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');

          expect(resp.body.uuid).to.not.be.empty;
          expect(resp.body.participants).to.be.an('array');
          expect(resp.body.participants[0].uuid).to.not.be.empty;

          done();
        });
    });

    it('creates a new participant when the room is created', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
      });

      Participant.count({}).then((beforeCount) => {
        chai.request(app)
          .post('/chats')
          .set({
            'X-Api-Version': '1.0',
            token,
          })
          .send({})
          .end(() => {
            Participant.count({}).then((afterCount) => {
              expect(beforeCount).to.be.equal(afterCount - 1);
              done();
            });
          });
      });
    });

    it('uses an already existing participant when the room is created', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });
      Participant.count({}).then((beforeCount) => {
        chai.request(app)
          .post('/chats')
          .set({
            'X-Api-Version': '1.0',
            token,
          })
          .send({})
          .end(() => {
            Participant.count({}).then((afterCount) => {
              expect(beforeCount).to.be.equal(afterCount);
              done();
            });
          });
      });
    });

    it('returns forbidden for invalid jwts', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
      });

      const forgery = createForgery(token);

      chai.request(app)
        .post('/chats')
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

    it('returns payment required for expired trial accounts', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
        trialStatus: {
          status: 'trial',
          trialIsExpired: true,
        },
      });

      chai.request(app)
        .post('/chats')
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(402);

          done();
        });
    });

    it('sends an event to rabbitmq that a room was created', (done) => {
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

              expect(message).to.be.not.empty;
              expect(message).to.contain(CHAT_CREATED);
              expect(message).to.contain('realType');

              ch.close();
              connection.close();

              done();
            }, { noAck: true });

            const token = createToken({
              clientId: '1',
              accountId: '1',
            });

            chai.request(app)
              .post('/chats')
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

  describe('GET /chats/:uuid', () => {
    it('responds with the room details, participants, and recent messages', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');

          expect(resp.body.uuid).to.not.be.empty;
          expect(resp.body.participants).to.be.an('array');
          expect(resp.body.participants).to.be.length(2);
          expect(resp.body.participants[0].uuid).to.not.be.empty;
          expect(resp.body.participants[1].uuid).to.not.be.empty;

          done();
        });
    });

    it('responds with 404 if the jwt does not have access to the chat', (done) => {
      const token = createToken({
        clientId: '8',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}`)
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
  });

  describe('PUT /chats/:id', () => {
    before(() => {
      subscribe('getUser', () => ({
        name: 'Test',
        email: 'test@test.com',
      }));
    });

    after(() => {
      unsubscribe('getUser');
    });

    it('can set the status of a chat if the jwt is for an agent', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '1',
      });

      chai.request(app)
        .put(`/chats/${chatRoomUuid}`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          status: 'closed',
        })
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');

          expect(resp.body.uuid).to.not.be.empty;
          expect(resp.body.status).to.be.equal('closed');

          done();
        });
    });

    it('responds with 404 if the jwt belongs to a client', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
      });

      chai.request(app)
        .put(`/chats/${chatRoomUuid}`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          status: 'closed',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it('responds with 404 if the jwt does not have access to the org', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '2',
      });

      chai.request(app)
        .put(`/chats/${chatRoomUuid}`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          status: 'closed',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it('responds with 402 if the jwt belongs to an expired trial accounts', (done) => {
      const token = createToken({
        clientId: '1',
        accountId: '1',
        trialStatus: {
          status: 'trial',
          trialIsExpired: true,
        },
      });

      chai.request(app)
        .post('/chats')
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({})
        .end((err, resp) => {
          expect(resp.status).to.be.equal(402);

          done();
        });
    });

    it('sends an event to rabbitmq that a room was updated', (done) => {
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

              expect(message).to.be.not.empty;
              expect(message).to.contain(CHAT_UPDATED);
              expect(message).to.contain('status');
              expect(message).to.contain('closed');
              expect(message).to.contain('Participants');

              ch.close();
              connection.close();

              done();
            }, { noAck: true });

            const token = createToken({
              userId: '1',
              accountId: '1',
            });

            chai.request(app)
              .put(`/chats/${chatRoomUuid}`)
              .set({
                'X-Api-Version': '1.0',
                token,
              })
              .send({
                status: 'closed',
              })
              .end(() => {
                // Do nothing
              });
          });
        });
      }).catch(done);
    });
  });
});
