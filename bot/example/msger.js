import logger from '../log';

function sendSource(msger, recipientId, sourcefn) {
  var fname = sourcefn.name;
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'Click to see source code',
          buttons:[{
            type: 'web_url',
            url: 'https://www.didi-ads.com/msgerbot/source?fname=' + fname,
            title: fname
          }]
        }
      }
    }
  };
  msger.callSendAPI(messageData);
}

function sendImageMessage(msger, recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: 'http://i.imgur.com/zYIlgBl.png'
        }
      }
    }
  };

  msger.callSendAPI(messageData);
}

function sendCatMessage(msger, recipientId) {
  var count = 0;
  var max = 5;

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: 'http://www.thecatapi.com/api/images/get'
        }
      }
    }
  };

  var f = function() {
    msger.callSendAPI(messageData);
    count += 1;
    if (count < max) {
      setTimeout(f, 2000);
    }
  };

  f();
}

function sendButtonMessage(msger, recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'This is test text',
          buttons:[{
            type: 'web_url',
            url: 'https://www.oculus.com/rift/',
            title: 'Open Web URL'
          }, {
            type: 'postback',
            title: 'Call Postback',
            payload: 'Developer defined postback'
          }]
        }
      }
    }
  };

  msger.callSendAPI(messageData);
}

function sendGenericMessage(msger, recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: 'rift',
            subtitle: 'Next-generation virtual reality',
            item_url: 'https://www.oculus.com/rift/',
            image_url: 'https://i.imgur.com/WjzjIMM.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/rift/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for first bubble',
            }],
          }, {
            title: 'Go',
            subtitle: 'Virtual reality, wherever you want to take it.',
            item_url: 'https://www.oculus.com/go/',
            image_url: 'https://i.imgur.com/mjHloAp.jpg',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/go/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for second bubble',
            }]
          }]
        }
      }
    }
  };

  msger.callSendAPI(messageData);
}

function sendReceiptMessage(msger, recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = 'order' + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: 'template',
        payload: {
          template_type: 'receipt',
          recipient_name: 'Peter Chang',
          order_number: receiptId,
          currency: 'USD',
          payment_method: 'Visa 1234',
          timestamp: '1428444852',
          elements: [{
            title: 'Oculus Rift',
            subtitle: 'Includes: headset, sensor, remote',
            quantity: 1,
            price: 599.00,
            currency: 'USD',
            image_url: 'https://i.imgur.com/WjzjIMM.png'
          }, {
            title: 'Samsung Gear VR',
            subtitle: 'Frost White',
            quantity: 1,
            price: 99.99,
            currency: 'USD',
            image_url: 'https://i.imgur.com/i6tdM89.jpg'
          }],
          address: {
            street_1: '1 Hacker Way',
            street_2: '',
            city: 'Menlo Park',
            postal_code: '94025',
            state: 'CA',
            country: 'US'
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: 'New Customer Discount',
            amount: -50
          }, {
            name: '$100 Off Coupon',
            amount: -100
          }]
        }
      }
    }
  };

  msger.callSendAPI(messageData);
}

function receivedMessage(messagingEvent, app, web, msger) {
  var senderID = messagingEvent.sender.id;
  var recipientID = messagingEvent.recipient.id;
  var timeOfMessage = messagingEvent.timestamp;
  var message = messagingEvent.message;

  logger.info(
    `Received message for user ${senderID} and page ${recipientID} at ${timeOfMessage}` +
    ` with message: ${JSON.stringify(message)}`
  );

  //var messageId = message.mid;
  // You may get a text or attachment but not both
  var messageText = message.text;
  //var messageAttachments = message.attachments;

  if (messageText) {
    switch (messageText.toLowerCase().trim()) {
      case 'image':
        sendImageMessage(msger, senderID);
        sendSource(msger, senderID, sendImageMessage);
        return true;

      case 'button':
        sendButtonMessage(msger, senderID);
        sendSource(msger, senderID, sendButtonMessage);
        return true;

      case 'generic':
        sendGenericMessage(msger, senderID);
        sendSource(msger, senderID, sendGenericMessage);
        return true;

      case 'receipt':
        sendReceiptMessage(msger, senderID);
        sendSource(msger, senderID, sendGenericMessage);
        return true;

      case 'cat':
        sendCatMessage(msger, senderID);
        sendSource(msger, senderID, sendCatMessage);
        return true;

      //default:
      //  sendQuickSelect(senderID);
    }
  }

  return false;
}

function findIntent(intents, candidates) {
  let final_intent = null;
  intents.forEach(intent => {
    if (candidates.includes(intent.value) && intent.confidence > 0.8) {
      if (final_intent == null) {
        final_intent = intent;
      } else {
        if (intent.confidence > final_intent.confidence) {
          final_intent = intent;
        }
      }
    }
  });
  return final_intent;
}

export function handle(messagingEvent, app, web, msger) {
  if (!messagingEvent.message) {
    return false;
  }
  return receivedMessage(messagingEvent, app, web, msger);
}

let supported_intents = {
  'image example': (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'image';
    return handle(messagingEvent, app, web, msger);
  },
  'cat example':  (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'cat';
    return handle(messagingEvent, app, web, msger);
  },
  'button example':  (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'button';
    return handle(messagingEvent, app, web, msger);
  },
  'generic example': (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'generic';
    return handle(messagingEvent, app, web, msger);
  },
  'receipt example': (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'receipt';
    return handle(messagingEvent, app, web, msger);
  },
  'example':  (messagingEvent, app, web, msger) => {
    messagingEvent.message.text = 'generic';
    return handle(messagingEvent, app, web, msger);
  }
};

export function handleIntent(intents, messagingEvent, app, web, msger) {
  let intent = findIntent(intents, Object.keys(supported_intents));
  logger.info(`found high confident indent: ${JSON.stringify(intent)}`);
  if (intent) {
    return supported_intents[intent.value](messagingEvent, app, web, msger);
  }
  return false;
}

export function findSource(fname) {
  var allsrc = {
    //'sendTextMessage': sendTextMessage,
    'sendCatMessage': sendCatMessage,
    'sendImageMessage': sendImageMessage,
    'sendButtonMessage': sendButtonMessage,
    'sendGenericMessage': sendGenericMessage,
  };
  return allsrc[fname];
}
