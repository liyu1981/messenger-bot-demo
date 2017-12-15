const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request'),
  witai = require('./witai')
  ;

var _app = null;

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function genVerifyRequestSignature(appSecret) {
  return (req, res, buf) => {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
      // For testing, let's log an error. In production, you should throw an
      // error.
      console.error("Couldn't validate the signature.");
    } else {
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];
      var expectedHash = crypto.createHmac('sha1', appSecret)
                               .update(buf)
                               .digest('hex');
      if (signatureHash != expectedHash) {
        throw new Error("Couldn't validate the request signature.");
      }
    }
  };
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference#auth
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference#message_delivery
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. Read
 * more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#postback
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

// public interfaces

// start the reaper
export function reaper(timeout) {
  function _callSendAPI(messageData, callback) {
    request({
      uri: 'https://graph.facebook.com/v2.11/me/messages',
      qs: { access_token: _app.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: messageData
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
        console.log("Successfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        // TODO: retry?
        console.error("Unable to send message.");
        console.error(response.statusCode, messageData);
        console.error(error);
      }
      callback && callback();
    });
  }

  var _timeout = timeout || 500;

  function _reap() {
    if (_app && _app.messageQueue && _app.messageQueue.length > 0) {
      var md = _app.messageQueue.shift();
      _callSendAPI(md, function() {
        _reap();
      });
    } else {
      setTimeout(_reap, _timeout);
    }
  };

  _reap();
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
export function callSendAPI(messageData) {
  _app && _app.messageQueue.push(messageData);
}

export function sendQuickSelect(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      "text": ('Hi, not quite understand what you mean, but I have following ' +
               'options: image/button/generic/receipt or cat.'),
      "quick_replies": [
        { "content_type":"text", "title":"image", "payload":"image" },
        { "content_type":"text", "title":"button", "payload":"button" },
        { "content_type":"text", "title":"generic", "payload":"generic" },
        { "content_type":"text", "title":"receipt", "payload":"receipt" },
        { "content_type":"text", "title":"cat", "payload":"cat" },
        { "content_type":"text", "title":"press 0", "payload":"0"},
      ]
    }
  };

  callSendAPI(messageData);
}

export function sendTextMessage(recipientId, messageText, userref) {
  var messageData = {
    recipient: (recipientId ? { id: recipientId } : { user_ref: userref }),
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

export function init(app, web, msger, plugins) {

  _app = app;

  app.messageQueue = [];

  msger.session = require('./msger_session.js');
  msger.session.init(app, web, msger);

  // setup www server to validate APP_SECRET
  web.www.use(bodyParser.json({ verify: genVerifyRequestSignature(app.APP_SECRET) }));

  /*
   * Use your own validation token. Check that the token used in the Webhook
   * setup is the same token used here.
   */
  web.www.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === app.VALIDATION_TOKEN) {
      console.log("Validating webhook");
      res.status(200).send(req.query['hub.challenge']);
    } else {
      console.error("Failed validation. Make sure the validation tokens match.");
      res.sendStatus(403);
    }
  });

  /*
   * All callbacks for Messenger are POST-ed. They will be sent to the same
   * webhook. Be sure to subscribe your app to your page to receive callbacks
   * for your page.
   * https://developers.facebook.com/docs/messenger-platform/implementation#subscribe_app_pages
   *
   */
  web.www.post('/webhook', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
      // Iterate over each entry
      // There may be multiple if batched
      data.entry.forEach(function(pageEntry) {
        var pageID = pageEntry.id;
        var timeOfEvent = pageEntry.time;

        // Iterate over each messaging event
        pageEntry.messaging.forEach(messagingEvent => {
          if (messagingEvent.message && messagingEvent.message.is_echo) {
            // echo message, we should skip
            return;
          }

          if (messagingEvent.read && messagingEvent.read.watermark) {
            // watermark msg, skip
            return;
          }

          // msger only messaging, no need to expose
          if (messagingEvent.optin && messagingEvent.sender) {
            receivedAuthentication(messagingEvent);
            return;
          } else if (messagingEvent.delivery) {
            receivedDeliveryConfirmation(messagingEvent);
            return;
          } else if (messagingEvent.postback) {
            receivedPostback(messagingEvent);
            return;
          }

          let handled_count = 0;
          plugins.forEach(plugin => {
            if (plugin.handle(messagingEvent, app, web, msger)) {
              handled_count += 1;
            }
          });

          if (handled_count == 0) {
            if (messagingEvent.message && messagingEvent.sender && messagingEvent.sender.id) {
              witai.tryToGuessIntent(messagingEvent.message)
                .then(
                  // yes we have an intent, serve it
                  (intents) => {
                    console.log('wit gives us: ', intents);
                    let handle_count = 0;
                    plugins.forEach(plugin => {
                      if (plugin.handleIntent(intents, messagingEvent, app, web, msger)) {
                        handle_count += 1;
                      }
                    });
                    if (handle_count == 0) {
                      return Promise.reject('we can not handle intents:' + JSON.stringify(intents));
                    }
                  }
                )
                .catch((reason) => {
                  console.log('intent handling error', reason);
                  sendQuickSelect(messagingEvent.sender.id);
                });
            }
            console.log("Webhook received unknown to handle messagingEvent: ", messagingEvent);
          }
        });
      });

      // Assume all went well.
      // You must send back a 200, within 20 seconds, to let us know you've
      // successfully received the callback. Otherwise, the request will time out.
      res.sendStatus(200);
    }
  });

  // finally if plugin has init, do init
  plugins.forEach(plugin => { plugin.init && plugin.init(app, web, msger); });

  // Start all reapers
  msger.reaper();
  msger.session.reaper();

}
