function sendSource(msger, recipientId, sourcefn) {
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
  msger.callSendAPI(messageData);
}

function sendImageMessage(msger, recipientId) {
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

function sendCatMessage(msger, recipientId) {
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

  msger.callSendAPI(messageData);
}

function sendGenericMessage(msger, recipientId) {
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

  msger.callSendAPI(messageData);
}

function sendReceiptMessage(msger, recipientId) {
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

  msger.callSendAPI(messageData);
}

function receivedMessage(messagingEvent, app, web, msger) {
  var senderID = messagingEvent.sender.id;
  var recipientID = messagingEvent.recipient.id;
  var timeOfMessage = messagingEvent.timestamp;
  var message = messagingEvent.message;

  console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
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
        sendImageMessage(msger, senderID);
        sendSource(msger, senderID, sendImageMessage);
        break;

      case 'button':
        sendButtonMessage(msger, senderID);
        sendSource(msger, senderID, sendButtonMessage);
        break;

      case 'generic':
        sendGenericMessage(msger, senderID);
        sendSource(msger, senderID, sendGenericMessage);
        break;

      case 'receipt':
        sendReceiptMessage(msger, senderID);
        sendSource(msger, senderID, sendGenericMessage);
        break;

      case 'cat':
        sendCatMessage(msger, senderID);
        sendSource(msger, senderID, sendCatMessage);
        break;

      //default:
      //  sendQuickSelect(senderID);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received, but I can not do anything to it currently. :(");
  }
}

export function handle(messagingEvent, app, web, msger) {
  if (!messagingEvent.message) {
    return false;
  }

  return receivedMessage(messagingEvent, app, web, msger);
};
