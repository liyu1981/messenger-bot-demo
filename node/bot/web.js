import express from 'express';

export function init(app, web, msger, plugins) {
  // now prepare the webserver
  web.www = express();
  web.www.set('port', process.env.PORT || 5000);
  web.www.use(express.static('public'));
  plugins.forEach(plugin => {
    plugin.init(web.www, app, msger);
  });
}
