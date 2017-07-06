const
  request = require('request')
  ;

export function init(www, app) {

  www.get('/source', function(req, res) {
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
  </code></pre>`
          );
        }
      });
    } else {
      res.status(200).send('Can not found source for ' + fn);
    }
  });

}
