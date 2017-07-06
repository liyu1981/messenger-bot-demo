var sessions = {};

export function reaper(timeout) {
  function _compress(sessions) {
    var nowtime = Math.floor(Date.now() / 1000);
    return Object.keys(sessions).reduce((acc, key) => {
      var s = sessions[key];
      if (s && s.reg && s.timeout && s.reg + s.timeout > nowtime) {
        acc[key] = s;
      }
    }, {});
  }

  var _timeout = timeout || 5000;

  function _reap() {
    var keys = Object.keys(sessions);
    if (keys.length > 0) {
      sessions = _compress(sessions);
    }
    setTimeout(_reap, _timeout);
  };

  _reap();
};

export function init(app, web, msger) {

}
