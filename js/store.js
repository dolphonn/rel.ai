(function () {
  "use strict";
  window.RAI = window.RAI || {};

  var cfg = RAI.config;
  var U = RAI.utils;
  var state = null; // { columns: [], cards: {}, labels: [] }
  var listeners = [];
  var storageOK = true;

  /* ---------- persistence ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(cfg.STORAGE_KEY);
      if (raw) {
        state = normalize(JSON.parse(raw));
        return;
      }
    } catch (e) { storageOK = false; }
    state = seed();
    save();
  }

  function save() {
    try {
      localStorage.setItem(cfg.STORAGE_KEY, JSON.stringify(state));
    } catch (e) { storageOK = false; }
  }

  function emit() {
    listeners.forEach(function (fn) { fn(); });
  }

  function commit() { save(); emit(); }

  // Defensive shape check so a hand-edited / stale localStorage payload can
  // never crash the app.
  function normalize(data) {
    data = data || {};
    var columns = Array.isArray(data.columns) ? data.columns : [];
    var cards = data.cards && typeof data.cards === "object" ? data.cards : {};
    var labels = Array.isArray(data.labels) ? data.labels : [];
    return { columns: columns, cards: cards, labels: labels };
  }

  function seed() {
    var cols = cfg.DEFAULT_COLUMNS.map(function (c) {
      return { id: U.uid(), title: c.title, done: !!c.done, cardIds: [], archived: false };
    });
    return { columns: cols, cards: {}, labels: [] };
  }

  /* ---------- queries ---------- */

  function getState() { return state; }
  function isStorageOK() { return storageOK; }
  function subscribe(fn) { listeners.push(fn); }

  function getColumn(id) {
    for (var i = 0; i < state.columns.length; i++) {
      if (state.columns[i].id === id) return state.columns[i];
    }
    return null;
  }
  function getCard(id) { return state.cards[id] || null; }

  function visibleColumns() { return state.columns.filter(function (c) { return !c.archived; }); }
  function archivedColumns() { return state.columns.filter(function (c) { return c.archived; }); }
  function activeColumnCards(colId) {
    var col = getColumn(colId);
    if (!col) return [];
    return col.cardIds.map(function (id) { return getCard(id); }).filter(Boolean);
  }
  function columnCards(colId) { return activeColumnCards(colId); }

  function archivedCards() {
    var out = [];
    Object.keys(state.cards).forEach(function (id) {
      if (state.cards[id].archived) out.push(state.cards[id]);
    });
    return out;
  }

  function labelsById() {
    var m = {};
    state.labels.forEach(function (l) { m[l.id] = l; });
    return m;
  }

  function allAssignees() {
    var set = {};
    Object.keys(state.cards).forEach(function (id) {
      var c = state.cards[id];
      if (!c.archived && c.assignee && c.assignee.trim()) set[c.assignee] = true;
    });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  /* ---------- column actions ---------- */

  function addColumn(title) {
    var col = { id: U.uid(), title: title || "New Column", done: false, cardIds: [], archived: false };
    state.columns.push(col);
    commit();
    return col;
  }

  function renameColumn(id, title) {
    var col = getColumn(id);
    if (col && title) col.title = title;
    commit();
  }

  // Move a column; `beforeId` null/undefined means "append to the end".
  function moveColumn(id, beforeId) {
    var from = -1, to = -1;
    for (var i = 0; i < state.columns.length; i++) {
      if (state.columns[i].id === id) from = i;
      if (beforeId && state.columns[i].id === beforeId) to = i;
    }
    if (from < 0 || (to > -1 && to === from)) return;
    var col = state.columns.splice(from, 1)[0];
    if (to < 0) state.columns.push(col);
    else {
      var t = 0;
      for (var j = 0; j < state.columns.length; j++) {
        if (state.columns[j].id === beforeId) { t = j; break; }
      }
      state.columns.splice(t, 0, col);
    }
    commit();
  }

  function setColumnDone(id, done) {
    var col = getColumn(id);
    if (col) col.done = !!done;
    commit();
  }

  // Archive a column together with every card inside it.
  function archiveColumn(id) {
    var col = getColumn(id);
    if (!col || col.archived) return;
    col.archived = true;
    col.archivedAt = Date.now();
    col.cardIds.forEach(function (cid) {
      var c = state.cards[cid];
      if (c && !c.archived) { c.archived = true; c.archivedAt = Date.now(); }
    });
    commit();
  }

  // Delete a column and its cards permanently. No restore afterwards.
  function deleteColumnForever(id) {
    var col = getColumn(id);
    if (!col) return;
    col.cardIds.forEach(function (cid) { delete state.cards[cid]; });
    state.columns.splice(state.columns.indexOf(col), 1);
    commit();
  }

  function restoreColumn(id) {
    var col = getColumn(id);
    if (!col || !col.archived) return;
    state.columns.splice(state.columns.indexOf(col), 1);
    col.archived = false;
    delete col.archivedAt;
    state.columns.push(col);
    col.cardIds.forEach(function (cid) {
      var c = state.cards[cid];
      if (c && c.archived) { c.archived = false; delete c.archivedAt; }
    });
    commit();
  }

  /* ---------- card actions ---------- */

  function createCard(data) {
    var id = U.uid();
    state.cards[id] = {
      id: id,
      title: data.title || "Untitled",
      description: data.description || "",
      labelIds: (data.labelIds || []).slice(),
      assignee: data.assignee || "",
      columnId: data.columnId,
      archived: false,
      createdAt: Date.now()
    };
    var col = getColumn(data.columnId);
    if (col) col.cardIds.push(id);
    commit();
    return state.cards[id];
  }

  function updateCard(id, patch) {
    var c = getCard(id);
    if (!c) return;
    if (patch.title != null) c.title = patch.title;
    if (patch.description != null) c.description = patch.description;
    if (patch.labelIds != null) c.labelIds = patch.labelIds.slice();
    if (patch.assignee != null) c.assignee = patch.assignee;
    commit();
  }

  // Move a card to `toColId`, inserting before `beforeId` (or at the end).
  function moveCard(id, toColId, beforeId) {
    var c = getCard(id);
    if (!c) return;
    var from = getColumn(c.columnId);
    if (from) {
      var i = from.cardIds.indexOf(id);
      if (i > -1) from.cardIds.splice(i, 1);
    }
    var to = getColumn(toColId);
    if (!to) return;
    if (beforeId && beforeId !== id) {
      var j = to.cardIds.indexOf(beforeId);
      if (j > -1) { to.cardIds.splice(j, 0, id); }
      else to.cardIds.push(id);
    } else {
      to.cardIds.push(id);
    }
    c.columnId = toColId;
    commit();
  }

  function moveCardByStep(id, dir) {
    var c = getCard(id);
    if (!c) return;
    var cols = visibleColumns();
    var ci = -1;
    for (var i = 0; i < cols.length; i++) if (cols[i].id === c.columnId) { ci = i; break; }
    if (ci < 0) return;
    var col = getColumn(c.columnId);
    var vis = col.cardIds.filter(function (cid) {
      var cc = getCard(cid);
      return cc && !cc.archived;
    });
    var pos = vis.indexOf(id);
    if (dir === "up" || dir === "down") {
      var target = dir === "up" ? pos - 1 : pos + 1;
      if (target < 0 || target >= col.cardIds.length) return;
      var beforeId = null;
      if (dir === "up") {
        beforeId = vis[target];
      } else {
        var next2 = dir === "down" ? vis[target + 1] : undefined;
        beforeId = next2 || null;
      }
      moveCard(id, c.columnId, beforeId);
    } else if (dir === "left" || dir === "right") {
      var tc = cols[ci + (dir === "left" ? -1 : 1)];
      if (!tc) return;
      moveCard(id, tc.id, null);
    }
  }

  function archiveCard(id) {
    var c = getCard(id);
    if (!c || c.archived) return;
    c.archived = true;
    c.archivedAt = Date.now();
    var col = getColumn(c.columnId);
    if (col) {
      var i = col.cardIds.indexOf(id);
      if (i > -1) col.cardIds.splice(i, 1);
    }
    commit();
  }

  // Restore a card; optionally into `targetColId` (needed when its original
  // column is itself archived or gone).
  function restoreCard(id, targetColId) {
    var c = getCard(id);
    if (!c || !c.archived) return;
    c.archived = false;
    delete c.archivedAt;
    var col = getColumn(targetColId || c.columnId);
    if (col && !col.archived) {
      moveCard(id, col.id, null);
    } else {
      commit();
    }
  }

  function deleteCardForever(id) {
    var c = getCard(id);
    if (!c) return;
    var col = getColumn(c.columnId);
    if (col) {
      var i = col.cardIds.indexOf(id);
      if (i > -1) col.cardIds.splice(i, 1);
    }
    delete state.cards[id];
    commit();
  }

  /* ---------- labels ---------- */

  function createLabel(name, color) {
    var label = { id: U.uid(), name: name || "Label", color: color || cfg.LABEL_COLORS[0].value };
    state.labels.push(label);
    commit();
    return label;
  }

  /* ---------- theme ---------- */

  function getTheme() {
    try { return localStorage.getItem(cfg.THEME_KEY) || ""; } catch (e) { return ""; }
  }
  function setTheme(t) {
    try { localStorage.setItem(cfg.THEME_KEY, t); } catch (e) {}
  }

  /* ---------- misc ---------- */

  function reset() {
    state = seed();
    commit();
  }

  RAI.store = {
    load: load,
    getState: getState,
    isStorageOK: isStorageOK,
    subscribe: subscribe,
    getColumn: getColumn,
    getCard: getCard,
    visibleColumns: visibleColumns,
    archivedColumns: archivedColumns,
    activeColumnCards: activeColumnCards,
    columnCards: columnCards,
    archivedCards: archivedCards,
    labelsById: labelsById,
    allAssignees: allAssignees,
    addColumn: addColumn,
    renameColumn: renameColumn,
    moveColumn: moveColumn,
    setColumnDone: setColumnDone,
    archiveColumn: archiveColumn,
    deleteColumnForever: deleteColumnForever,
    restoreColumn: restoreColumn,
    createCard: createCard,
    updateCard: updateCard,
    moveCard: moveCard,
    moveCardByStep: moveCardByStep,
    archiveCard: archiveCard,
    restoreCard: restoreCard,
    deleteCardForever: deleteCardForever,
    createLabel: createLabel,
    getTheme: getTheme,
    setTheme: setTheme,
    reset: reset
  };
})();