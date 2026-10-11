(function () {
  "use strict";
  window.RAI = window.RAI || {};

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Escape a string for safe interpolation into innerHTML.
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initials(name) {
    var parts = String(name || "").trim().split(/[\s-]+/).filter(Boolean);
    if (!parts.length) return "?";
    var a = parts[0].charAt(0).toUpperCase();
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
    return a + b;
  }

  function timeAgo(ts) {
    if (!ts) return "";
    var diff = Date.now() - ts;
    if (diff < 60e3) return "just now";
    var m = Math.floor(diff / 60e3);
    if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " hr ago";
    var d = Math.floor(h / 24);
    if (d < 7) return d + " day" + (d > 1 ? "s" : "") + " ago";
    try { return new Date(ts).toLocaleDateString(); } catch (e) { return ""; }
  }

  RAI.utils = { uid: uid, esc: esc, initials: initials, timeAgo: timeAgo };
})();