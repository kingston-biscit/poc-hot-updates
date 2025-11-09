(function () {
  // Only run in Cordova environments
  document.addEventListener(
    'deviceready',
    function () {
      try {
        var active = localStorage.getItem('ota:active');
        if (!active) return;

        // active is a file URL like: file:///.../bundles/1.0.1/index.html
        console.log('[OTA] Active bundle found:', active);

        // Simple safety check
        if (typeof active === 'string' && active.startsWith('file:///')) {
          // Redirect before Angular boots
          window.location.replace(active);
        }
      } catch (e) {
        console.error('[OTA] Loader error', e);
      }
    },
    { once: true }
  );
})();
