/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var app = express();

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

var messageQueue = [];
var oncall = null;

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

const WIT = config.get('wit');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.get('/source', function(req, res) {
  var allsrc = {
    'sendTextMessage': sendTextMessage,
    'sendCatMessage': sendCatMessage,
    'sendImageMessage': sendImageMessage,
    'sendButtonMessage': sendButtonMessage,
    'sendGenericMessage': sendGenericMessage,
  };
  var fn = req.query['fname'];
  if (fn in allsrc) {
    request({
      uri: 'http://hilite.me/api',
      method: 'POST',
      formData: {
        code: allsrc[fn].toString(),
        lexer: 'javascript'
      }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.status(200).send(body +
`<pre><code>
callSendAPI send HTTP POST request with following setting
{
  uri: 'https://graph.facebook.com/v2.6/me/messages',
  qs: { access_token: PAGE_ACCESS_TOKEN },
  method: 'POST',
  json: messageData
}
</code></pre>`);
      }
    });
  } else {
    res.status(200).send('Can not found source for ' + fn);
  }
});

app.get('/oncall', function(req, res) {
  var recipient = req.query.recipient;
  res.status(200).send(
`<meta name="viewport" content="width=device-width, initial-scale=1">
<form action="oncall_send">
<h2>Leave your message here:</h2>
<textarea rows="9" cols="40" name="msg"></textarea>
<input type="hidden" name="recipient" value="${recipient}"></input>
<br />
<input type="submit" value="submit"></input>
</form>
`);
});

app.get('/oncall_send', function(req, res) {
  if (oncall) {
    sendTextMessage(oncall, "Someone wants you! He said: " + req.query.msg);
    sendOncallReplyMessage(oncall, req.query.recipient);
  }
  res.status(200).send(
`<meta name="viewport" content="width=device-width, initial-scale=1">
<h2>Message is sent to oncall.</h2>
You may close this page now.
`);
});

app.get('/oncall_reply', function(req, res) {
  var recipient = req.query.recipient;
  console.log('recipient', recipient);
  if (recipient) {
    sendTextMessage(recipient, 'From Oncall: ' + req.query.msg);
  }
  res.status(200).send(
`<meta name="viewport" content="width=device-width, initial-scale=1">
<h2>Message is sent to client.</h2>
You may close this page now.
`);
});

app.get('/oncall_reply_form', function(req, res) {
  var recipient = req.query.recipient;
  res.status(200).send(
`<meta name="viewport" content="width=device-width, initial-scale=1">
<form action="oncall_reply">
<h2>Reply to client with message here:</h2>
<textarea rows="9" cols="40" name="msg"></textarea>
<input type="hidden" name="recipient" value="${recipient}"></input>
<br />
<input type="submit" value="submit"></input>
</form>
`);
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/implementation#subscribe_app_pages
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          if (messagingEvent.sender) {
          receivedAuthentication(messagingEvent);
          } else {
            // from checkbox, https://developers.facebook.com/docs/messenger-platform/plugin-reference/checkbox-plugin
            receivedCheckboxAuthentication(messagingEvent);
          }
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
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

function receivedCheckboxAuthentication(event) {
  console.log(event);
  var userref = event.optin['user_ref'];
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received checkbox authentication for userref %s and page %d with pass " +
    "through param '%s' at %d", userref, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(null, "Hi, got your order", userref);
  sendConfirmOrderMessage(userref, passThroughParam);
  sendOncallMessage(null, userref);
}

function sendConfirmOrderMessage(userref, params) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);
  var p = JSON.parse(params);

  var messageData = {
    recipient: {
      user_ref: userref
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Walkin customer",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Free",
          timestamp: p.time,
          elements: [],
          summary: {
            total_cost: p.total
          }
        }
      }
    }
  };

  p.cart.forEach(function(item) {
    messageData.message.attachment.payload.elements.push({
      title: item.title,
      price: 0,
      currency: "USD",
      //'image_url': item.image_link
    });
  });
  console.log('will confirm', messageData);

  callSendAPI(messageData);
}


/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#received_message
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText.toLowerCase().trim()) {
      case 'image':
        sendImageMessage(senderID);
        sendSource(senderID, sendImageMessage);
        break;

      case 'button':
        sendButtonMessage(senderID);
        sendSource(senderID, sendButtonMessage);
        break;

      case 'generic':
        sendGenericMessage(senderID);
        sendSource(senderID, sendGenericMessage);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        sendSource(senderID, sendGenericMessage);
        break;

      case 'cat':
        sendCatMessage(senderID);
        sendSource(senderID, sendCatMessage);
        break;

      case 'press 0':
        sendOncallMessage(senderID);
        break;

      case 'takeoncall':
        sendTakeoncallMessage(senderID);
        break;

      default:
        sendQuickSelect(senderID);
        //sendSource(senderID, sendQuickSelect);
        //tryUnderstand(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received, but I can not do anything to it currently. :(");
  }
}

function sendQuickSelect(recipientId) {
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

function tryUnderstand(senderID, messageText) {
  request({
    uri: 'https://api.wit.ai/message',
    header: {
      'Authorization': 'Bearer ' + WIT.accessToken
    },
    qs: {
      v: '20160526',
      q: messageText
    },
    method: 'GET'
  }, (error, resp, body) => {
    console.log('wit returns:');
    if (!error && resp.statusCode == 200) {
      console.log(resp);
    } else {
      console.log(error, resp.body);
    }
  });
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
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
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

function sendSource(recipientId, sourcefn) {
  var fname = sourcefn.name;
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Click to see source code",
          buttons:[{
            type: "web_url",
            url: "https://www.didi-ads.com/msgerbot/source?fname=" + fname,
            title: fname
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

/*
 * Send a message with an using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: "http://i.imgur.com/zYIlgBl.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendCatMessage(recipientId) {
  var count = 0;
  var max = 5;

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: "http://www.thecatapi.com/api/images/get"
        }
      }
    }
  };

  var f = function() {
    callSendAPI(messageData);
    count += 1;
    if (count < max) {
      setTimeout(f, 2000);
    }
  };

  f();
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText, userref) {
  var messageData = {
    recipient: {
      id: recipientId,
      user_ref: userref
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendOncallMessage(recipientId, userref) {
  var messageData = {
    recipient: {
      id: recipientId,
      user_ref: userref
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Oncall",
          buttons:[{
            type: "web_url",
            url: "https://www.didi-ads.com/msgerbot/oncall?recipient=" + recipientId,
            title: "Leave message",
            "webview_height_ratio": "compact"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendOncallReplyMessage(recipientId, clientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Oncall Reply",
          buttons:[{
            type: "web_url",
            url: "https://www.didi-ads.com/msgerbot/oncall_reply_form?recipient=" + clientId,
            title: "Leave Reply",
            "webview_height_ratio": "compact"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendTakeoncallMessage(recipientId) {
  oncall = recipientId;
  sendTextMessage(recipientId, "Got it! Your are the oncall now!");
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Call Postback",
            payload: "Developer defined postback"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",
          timestamp: "1428444852",
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: "http://messengerdemo.parseapp.com/img/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: "http://messengerdemo.parseapp.com/img/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  messageQueue.push(messageData);
}

(function() {
  function _callSendAPI(messageData, callback) {
    //console.log('now send', JSON.stringify(messageData, null, 2));
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: messageData
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
        console.log("Successfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        // TODO: retry?
        console.error("Unable to send message.");
        //console.error(response);
        console.error(error);
      }
      callback && callback();
    });
  }

  function _reap() {
    if (messageQueue.length > 0) {
      var md = messageQueue.shift();
      _callSendAPI(md, function() {
        _reap();
      });
    } else {
      setTimeout(_reap, 500);
    }
  };

  _reap();
})();

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
