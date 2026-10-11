(function () {
  "use strict";

  // Boot order matters (see the script tags in index.html):
  // config -> utils -> store -> filters -> dnd -> ui, then this file.
  var store = RAI.store;

  store.load();

  RAI.ui.init();
  RAI.dnd.init();

  // Any committed state change re-renders the board + toolbar. The archive
  // panel refreshes itself when open (handled inside ui.renderAll).
  store.subscribe(function () { RAI.ui.renderAll(); });

  RAI.ui.renderAll();

  if (!store.isStorageOK()) {
    RAI.ui.toast("Heads up: storage is unavailable, so your board won't persist between reloads.");
  }
})();