import logger from '../log';

function genSendOncallReplyMessage(msger, recipientId, clientId) {
  return (recipientId, _clientId) => {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'Click below button to send reply to customer.',
            buttons:[{
              type: 'web_url',
              url: 'https://www.didi-ads.com/msgerbot/oncall_reply_form?recipient=' + clientId,
              title: 'Input reply',
              'webview_height_ratio': 'compact'
            }]
          }
        }
      }
    };
    msger.callSendAPI(messageData);
  };
}

function sendOncallMessage(msger, recipientId, userref) {
  var messageData = {
    recipient: {
      id: recipientId,
      user_ref: userref
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'You have reached customer service, please click below button to leave us a message. We will get back to you ASAP.',
          buttons:[{
            type: 'web_url',
            url: 'https://www.didi-ads.com/msgerbot/oncall?recipient=' + recipientId,
            title: 'Leave message',
            'webview_height_ratio': 'compact'
          }]
        }
      }
    }
  };

  msger.callSendAPI(messageData);
}

function sendTakeoncallMessage(msger, recipientId) {
  msger.sendTextMessage(recipientId, 'Got it! Your are the oncall now!');
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
      case 'press 0':
        sendOncallMessage(msger, senderID);
        return true;

      case 'takeoncall':
        app.oncall = senderID;
        sendTakeoncallMessage(msger, senderID);
        return true;
    }
  }

  return false;
}

export function init(app, web, msger) {
  app.oncall = null;
  msger.sendOncallReplyMessage = genSendOncallReplyMessage(msger);
}

export function handle(messagingEvent, app, web, msger) {
  if (!messagingEvent.message) {
    return false;
  }
  return receivedMessage(messagingEvent, app, web, msger);
}

export function handleIntent(_intents, _messagingEvent, _app, _web, _msger) {
  return false;
}
