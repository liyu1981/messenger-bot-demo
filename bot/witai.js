import config from 'config';
import request from 'request';
import logger from './log';

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

export function tryToGuessIntent(message) {
  return new Promise((resolve, reject) => {
    request(
      prepareWitAiRequest(message),
      (error, response, body) => {
        if (!error && response.statusCode == 200) {
          logger.info(`wit return: ${JSON.stringify(body)}`);
          let {entities: {message_subject: sq}} = JSON.parse(body);
          if (sq && sq.length > 0) {
            resolve(sq);
          } else {
            reject('Wit retrun no message_subject.');
          }
        } else {
          logger.error(`Wit error: ${JSON.stringify(error)}`);
          reject('Wit returned error.');
        }
      }
    );
  });
}
