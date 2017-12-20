let sessions = {};

const TIMEOUT_20_MIN = 20*60*1000;

export function reaper(timeout) {
  function _compress(sessions) {
    let nowtime = Math.floor(Date.now() / 1000);
    return Object.keys(sessions).reduce((acc, key) => {
      let s = sessions[key];
      if (s && s.reg && s.timeout && s.reg + s.timeout > nowtime) {
        acc[key] = s;
      }
    }, {});
  }

  let _timeout = timeout || 5000;

  function _reap() {
    let keys = Object.keys(sessions);
    if (keys.length > 0) {
      sessions = _compress(sessions);
    }
    setTimeout(_reap, _timeout);
  }

  _reap();
}

export function init(_app, _web, _msger) {
}

export function find(key) {
  return sessions[key];
}

export function reg(key, options) {
  let nowtime = Math.floor(Date.now() / 1000);
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
