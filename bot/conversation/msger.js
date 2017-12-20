function receivedMessage(messagingEvent, _app, _web, _msger) {
  //var senderID = messagingEvent.sender.id;
  //var recipientID = messagingEvent.recipient.id;
  //var timeOfMessage = messagingEvent.timestamp;
  var message = messagingEvent.message;

  //console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));

  //var _messageId = message.mid;
  var messageText = message.text;
  //var _messageAttachments = message.attachments;

  if (messageText) {
    switch (messageText.toLowerCase().trim()) {
      /*case 'press 0':
        sendOncallMessage(msger, senderID);
        return true;

      case 'takeoncall':
        app.oncall = senderID;
        sendTakeoncallMessage(msger, senderID);
        return true;
      */
    }
  }

  return false;
}

export function init(_app, _web, _msger) {
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
