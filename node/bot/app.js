import config from 'config';
import logger from './log';

var app = {};

// App Secret can be retrieved from the App Dashboard
app.APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
app.VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
app.PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

if (!(app.APP_SECRET && app.VALIDATION_TOKEN && app.PAGE_ACCESS_TOKEN)) {
  logger.error('Missing config values');
  process.exit(1);
}

export default app;
