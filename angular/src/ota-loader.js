(function () {
  // Only run in Cordova environments
  document.addEventListener(
    'deviceready',
    function () {
      try {
        var active = localStorage.getItem('ota:active');
        if (!active) return;

        console.log('[OTA] Active bundle found:', active);

        // Allow cdvfile:// (and file:// as fallback)
        if (
          typeof active === 'string' &&
          (active.startsWith('cdvfile://') || active.startsWith('file:///'))
        ) {
          window.location.replace(active);
        }
      } catch (e) {
        console.error('[OTA] Loader error', e);
      }
    },
    { once: true }
  );
})();
