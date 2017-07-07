var sessions = {};

const TIMEOUT_20_MIN = 20*60*1000;

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
  }

  _reap();
}

export function init(app, web, msger) {

}

export function find(key) {
  return sessions[key];
}

export function reg(key, options) {
  var nowtime = Math.floor(Date.now() / 1000);
  sessions[key] = {
    reg: nowtime,
    timeout: (options && options.timeout) || TIMEOUT_20_MIN
  };
}

export function update(key, changes) {
  if (!find(key)) {
    return;
  }

  Object.keys(changes).map(k => {
    if (k in sessions[key]) {
      sessions[key][k] = changes[k];
    }
  });
}
