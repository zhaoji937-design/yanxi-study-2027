(function () {
  'use strict';
  var status = '正在保存离线题库，请稍候…';
  function refresh() {
    var label = document.getElementById('offline-status');
    if (label) label.textContent = status;
  }
  function setStatus(text) { status = text; refresh(); }
  globalThis.YanxiOffline = { refresh: refresh };
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    setStatus('当前打开方式不支持离线保存。请使用 Safari 打开 HTTPS 网站；在线浏览仍可使用。');
    return;
  }
  function check(worker) {
    return new Promise(function (resolve, reject) {
      var channel = new MessageChannel();
      var timer = setTimeout(function () { channel.port1.close(); reject(new Error('Offline status timeout')); }, 10000);
      channel.port1.onmessage = function (event) {
        clearTimeout(timer); channel.port1.close();
        if (event.data && event.data.ready) resolve();
        else reject(new Error('Offline cache is incomplete'));
      };
      worker.postMessage({ type: 'YANXI_OFFLINE_STATUS' }, [channel.port2]);
    });
  }
  function waitForActive(registration) {
    return new Promise(function (resolve, reject) {
      var worker = registration.installing || registration.waiting;
      var finished = false;
      var timer = setTimeout(function () { done(new Error('Offline installation timeout')); }, 45000);
      function done(error, active) {
        if (finished) return;
        finished = true; clearTimeout(timer);
        if (worker) worker.removeEventListener('statechange', changed);
        if (error) reject(error); else resolve(active);
      }
      function changed() {
        if (registration.active) done(null, registration.active);
        else if (worker && worker.state === 'redundant') done(new Error('Offline installation failed'));
      }
      if (worker) worker.addEventListener('statechange', changed);
      changed();
      navigator.serviceWorker.ready.then(function (active) { done(null, active.active); });
    });
  }
  refresh();
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(waitForActive)
    .then(check)
    .then(function () { setStatus('离线题库已保存：题目和答案可断网打开。'); })
    .catch(function () { setStatus('离线保存尚未完成。在线浏览仍可使用，请联网后重新打开本站。'); });
})();
