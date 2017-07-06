export function init(www, app, msger) {

  www.get('/oncall', function(req, res) {
    var recipient = req.query.recipient;
    res.status(200).send(
  `<meta name="viewport" content="width=device-width, initial-scale=1">
  <form action="oncall_send">
    <h2>Leave your message here:</h2>
    <textarea rows="9" cols="40" name="msg"></textarea>
    <input type="hidden" name="recipient" value="${recipient}"></input>
    <br />
    <input type="submit" value="submit"></input>
  </form>`
  );
  });

  www.get('/oncall_send', function(req, res) {
    if (oncall) {
      msger.sendTextMessage(oncall, "Someone wants you! He said: " + req.query.msg);
      msger.sendOncallReplyMessage(oncall, req.query.recipient);
    }
    res.status(200).send(
  `<meta name="viewport" content="width=device-width, initial-scale=1">
  <h2>Message is sent to oncall.</h2>
  You may close this page now.`
    );
  });

  www.get('/oncall_reply', function(req, res) {
    var recipient = req.query.recipient;
    console.log('recipient', recipient);
    if (recipient) {
      msger.sendTextMessage(recipient, 'From Oncall: ' + req.query.msg);
    }
    res.status(200).send(
  `<meta name="viewport" content="width=device-width, initial-scale=1">
  <h2>Message is sent to client.</h2>
  You may close this page now.`
    );
  });

  www.get('/oncall_reply_form', function(req, res) {
    var recipient = req.query.recipient;
    res.status(200).send(
  `<meta name="viewport" content="width=device-width, initial-scale=1">
  <form action="oncall_reply">
  <h2>Reply to client with message here:</h2>
  <textarea rows="9" cols="40" name="msg"></textarea>
  <input type="hidden" name="recipient" value="${recipient}"></input>
  <br />
  <input type="submit" value="submit"></input>
  </form>`
    );
  });
  
}
