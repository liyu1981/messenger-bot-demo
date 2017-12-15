const
  config = require('config'),
  request = require('request')
  ;

function prepareWitAiRequest(message) {
  let witToken = config.get('witToken');
  return {
    uri: 'https://api.wit.ai/message',
    headers: {
      'Authorization': `Bearer ${witToken}`
    },
    qs: {
      'v': '15/12/2017',
      'q': message.text
    }
  };
}

export function tryToGuessIntent(message, handle, fallback) {
  return new Promise((resolve, reject) => {
    request(
      prepareWitAiRequest(message),
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          console.log('wit return:', body);
          let {entities: {message_subject: sq}} = JSON.parse(body);
          if (sq && sq.length > 0) {
            resolve(sq);
          } else {
            reject('Wit retrun no message_subject.');
          }
        } else {
          console.error("Wit error.");
          console.error(error);
          reject('Wit returned error.');
        }
      }
    );
  });
};
