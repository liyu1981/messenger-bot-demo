
export function init(www, app, msger) {

  let bootstrap_cdn = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/css/bootstrap.min.css" integrity="sha384-PsH8R72JQ3SOdhVi3uxftmaW6Vc51MKb0q5P2rRUpPvrszuE4W1povHYgTpBfshb" crossorigin="anonymous">';

  www.get('/oncall', function(req, res) {
    let recipient = req.query.recipient;
    res.status(200).send(`
<meta name="viewport" content="width=device-width, initial-scale=1">
${bootstrap_cdn}
<div class="container">
<form action="oncall_send">
  <label><b>Message to Operator:</b></label>
  <div class="form-group">
    <textarea class="form-control" rows="5" name="msg" placeholder="Leave your message here..."></textarea>
  </div>
  <input type="hidden" name="recipient" value="${recipient}"></input>
  <div class="form-group">
    <input class="btn btn-outline-primary btn-block" type="submit" value="send"></input>
  </div>
</form>
</div>
  `);
  });

  www.get('/oncall_send', function(req, res) {
    if (app.oncall) {
      msger.sendTextMessage(app.oncall, 'Someone wants you! He said: ' + req.query.msg);
      msger.sendOncallReplyMessage(app.oncall, req.query.recipient);
    }
    res.status(200).send(`
<meta name="viewport" content="width=device-width, initial-scale=1">
${bootstrap_cdn}
<div class="container">
  <br/>
  <div class="alert alert-success" role="alert">
  <h4 class="alert-heading">Your message has been sent to operator.</h4>
  <p>
    Our operator will get back to you soon.<br/>
    You may close this page now.
  </p>
  </div>
</div>
    `);
  });

  www.get('/oncall_reply', function(req, res) {
    let recipient = req.query.recipient;
    if (recipient) {
      msger.sendTextMessage(recipient, 'From Oncall: ' + req.query.msg);
    }
    res.status(200).send(`
<meta name="viewport" content="width=device-width, initial-scale=1">
${bootstrap_cdn}
<div class="container">
  <br/>
  <div class="alert alert-success" role="alert">
  <h4 class="alert-heading">Your message has been sent to user.</h4>
  <p>
    You may close this page now.
  </p>
  </div>
</div>
    `);
  });

  www.get('/oncall_reply_form', function(req, res) {
    let recipient = req.query.recipient;
    res.status(200).send(`
<meta name="viewport" content="width=device-width, initial-scale=1">
${bootstrap_cdn}
<div class="container">
  <form action="oncall_reply">
    <label><b>Message to User:</b></label>
    <div class="form-group">
      <textarea class="form-control" rows="5" name="msg" placeholder="Leave your message here..."></textarea>
    </div>
  <input type="hidden" name="recipient" value="${recipient}"></input>
  <div class="form-group">
    <input class="btn btn-outline-primary btn-block" type="submit" value="send"></input>
  </div>
  </form>
</div>
    `);
  });

}
