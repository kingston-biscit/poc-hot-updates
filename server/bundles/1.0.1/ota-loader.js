(function () {
  document.addEventListener(
    'deviceready',
    function () {
      try {
        var w = window;
        if (!w.cordova || !w.cordova.file || !w.resolveLocalFileSystemURL) {
          console.log('[OTA] Loader: Cordova/File not available, skipping');
          return;
        }

        var dataDir = w.cordova.file.dataDirectory;
        var statePath = dataDir + 'ota-state.json';
        var current = w.location.href;

        console.log('[OTA] Loader: current =', current);
        console.log('[OTA] Loader: checking', statePath);

        w.resolveLocalFileSystemURL(
          statePath,
          function (entry) {
            entry.file(function (file) {
              var reader = new FileReader();
              reader.onloadend = function () {
                try {
                  if (!this.result) {
                    console.log('[OTA] Loader: empty state file');
                    return;
                  }

                  var state = JSON.parse(this.result);
                  var target = state && state.activeUrl;

                  if (typeof target === 'string' && target && target !== current) {
                    console.log('[OTA] Loader: redirecting to', target);
                    w.location.replace(target);
                  } else {
                    console.log('[OTA] Loader: no redirect (missing target or already there)');
                  }
                } catch (e) {
                  console.error('[OTA] Loader: parse error', e);
                }
              };
              reader.readAsText(file);
            });
          },
          function () {
            console.log('[OTA] Loader: no ota-state.json, using bundled app as-is');
          }
        );
      } catch (e) {
        console.error('[OTA] Loader error', e);
      }
    },
    { once: true }
  );
})();
