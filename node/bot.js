require('babel-register')({ presets: [ 'es2015' ]});

const
  app = require('./bot/app.js'),
  web = require('./bot/web.js'),
  msger = require('./bot/msger.js')
  ;

web.init(app, web, msger, [
  require('./bot/example/web.js'),
  require('./bot/oncall/web.js'),
]);

msger.init(app, web, msger, [
  require('./bot/example/msger.js'),
  require('./bot/oncall/msger.js'),
  require('./bot/order/msger.js'),
]);

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
web.www.listen(web.www.get('port'), function() {
  console.log('Messenger bot app is running on port', web.www.get('port'));
});
