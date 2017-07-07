function extractPriceAndCurrency(item) {
  var rawPrice = item.price;
  var [rawPrice, rawCurrency] = rawPrice.replace(',', '.').split(' ');
  return [parseFloat(rawPrice), rawCurrency];
}

function sendConfirmOrderMessage(msger, userref, params) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "Order " + Math.floor(Math.random()*1000);
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
          payment_method: "Free Visa 8888",
          timestamp: p.time,
          elements: [],
          address:{
            street_1: "King Street",
            street_2: "",
            city: "Sydney",
            postal_code: "2000",
            state: "NSW",
            country: "AU",
          },
          summary: {
            subtotal: p.total,
            shipping_cost: 0,
            total_tax: 0,
            total_cost: p.total,
          }
        }
      }
    }
  };

  p.cart.forEach(function(item) {
    var [itemPrice, itemCurrency] = extractPriceAndCurrency(item);
    messageData.message.attachment.payload.elements.push({
      title: item.title,
      quantity: 1,
      price: itemPrice,
      currency: itemCurrency,
      "image_url": item.image_link
    });
  });

  msger.callSendAPI(messageData);
}

function receivedCheckboxAuthentication(event, msger) {
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
  msger.sendTextMessage(null, "Hi, got your order", userref);
  sendConfirmOrderMessage(msger, userref, passThroughParam);
  //msger.sendOncallMessage(null, userref);
}

export function handle(messagingEvent, app, web, msger) {
  if (messagingEvent.optin && !messagingEvent.sender) {
    // from checkbox, https://developers.facebook.com/docs/messenger-platform/plugin-reference/checkbox-plugin
    // console.log(messagingEvent);
    receivedCheckboxAuthentication(messagingEvent, msger);
    return true;
  }
  return false;
};
