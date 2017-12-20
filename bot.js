import app from './bot/app';
import * as web from './bot/web';
import * as msger from './bot/msger';
import logger from './bot/log';

web.init(app, web, msger, [
  require('./bot/example/web'),
  require('./bot/oncall/web'),
  require('./bot/conversation/web'),
]);

msger.init(app, web, msger, [
  require('./bot/example/msger'),
  require('./bot/oncall/msger'),
  require('./bot/order/msger'),
  require('./bot/conversation/msger'),
]);

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.,
web.www.listen(web.www.get('port'), () => {
  logger.info(`Messenger bot app is running on port ${web.www.get('port')}`);
});
