const chai = require('chai');

const { expect } = chai;

const InjectInterface = require('service-claire/test/helpers/inject');
const { createToken } = require('service-claire/helpers/tokens');
const { createForgery } = require('service-claire/test/helpers/forgery');
const { createConnection } = require('service-claire/services/pubsub');
const { MESSAGE_CREATED } = require('service-claire/events');

const chatSeeds = require('../../seeders/20170625214520825-create-chats');

const chatRoomUuid = '32fd8b05-75e6-4246-aef5-bbb619191693';

const { app } = require('../../src/index');

describe('Messages 1.0', () => {
  beforeEach((done) => {
    InjectInterface(chatSeeds.down).then(() => {
      return InjectInterface(chatSeeds.up).then(() => done());
    }).catch(done);
  });

  describe('GET /chats/:id/msgs', () => {
    it('retrieves paged data for a chat\'s messages', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send()
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');
          expect(resp.body.messages).to.be.an('array');
          expect(resp.body.messages).to.be.length(2);

          expect(resp.body.messages[0].uuid).to.not.be.empty;
          expect(resp.body.messages[0].participantId).to.not.be.empty;
          expect(resp.body.messages[0].text).to.not.be.empty;
          expect(resp.body.messages[1].uuid).to.not.be.empty;
          expect(resp.body.messages[1].text).to.not.be.empty;
          expect(resp.body.messages[1].participantId).to.not.be.empty;

          done();
        });
    });

    it('retrieves paged data for a chat\'s messages if the user is in the org', (done) => {
      const token = createToken({
        userId: '100',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send()
        .end((err, resp) => {
          expect(err).to.be.null;
          expect(resp.status).to.be.equal(200);
          expect(resp.body).to.be.an('object');
          expect(resp.body.messages).to.be.an('array');
          expect(resp.body.messages).to.be.length(2);

          expect(resp.body.messages[0].uuid).to.not.be.empty;
          expect(resp.body.messages[0].participantId).to.not.be.empty;
          expect(resp.body.messages[0].text).to.not.be.empty;
          expect(resp.body.messages[1].uuid).to.not.be.empty;
          expect(resp.body.messages[1].text).to.not.be.empty;
          expect(resp.body.messages[1].participantId).to.not.be.empty;

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
        .get(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token: forgery,
        })
        .send()
        .end((err, resp) => {
          expect(resp.status).to.be.equal(403);

          done();
        });
    });

    it('returns not found for invalid client ids', (done) => {
      const token = createToken({
        clientId: '10',
        accountId: '1',
      });

      chai.request(app)
        .get(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send()
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

          done();
        });
    });

    it.skip('retrieves the second page of data for a chat\'s messages', (done) => {
      done({ error: 'not implemented' });
    });
  });

  describe('POST /chats/:id/msgs', () => {
    it('creates a message for the given chat room by a client', (done) => {
      const token = createToken({
        clientId: '2',
        accountId: '1',
      });

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          text: 'My cool message',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(200);
          expect(resp.body.uuid).to.not.be.empty;

          done();
        });
    });

    it('creates a message for the given chat room by a user', (done) => {
      const token = createToken({
        userId: '1',
        accountId: '1',
      });

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          text: 'My cool message',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(200);
          expect(resp.body.uuid).to.not.be.empty;

          done();
        });
    });

    it('returns forbidden for invalid jwts', (done) => {
      const token = createToken({
        clientId: '10',
        accountId: '1',
      });

      const forgery = createForgery(token);

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token: forgery,
        })
        .send({
          text: 'My cool message',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(403);

          done();
        });
    });

    it('returns not found for invalid clients', (done) => {
      const token = createToken({
        clientId: '10',
        accountId: '1',
      });

      chai.request(app)
        .post(`/chats/${chatRoomUuid}/msgs`)
        .set({
          'X-Api-Version': '1.0',
          token,
        })
        .send({
          text: 'My cool message',
        })
        .end((err, resp) => {
          expect(resp.status).to.be.equal(404);

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
        .post(`/chats/${chatRoomUuid}/msgs`)
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

    it('sends a message to pubsub that a message was created', (done) => {
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
              expect(message).to.contain(MESSAGE_CREATED);
              expect(message).to.contain('text');
              expect(message).to.contain('My cool message');
              expect(message).to.contain('chat');
              expect(message).to.contain('Participants');

              ch.close();
              connection.close();

              done();
            }, { noAck: true });

            const token = createToken({
              clientId: '2',
              accountId: '1',
            });

            chai.request(app)
              .post(`/chats/${chatRoomUuid}/msgs`)
              .set({
                'X-Api-Version': '1.0',
                token,
              })
              .send({
                text: 'My cool message',
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
