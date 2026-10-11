(function () {
  "use strict";
  window.RAI = window.RAI || {};

  // Filter state is UI-only (not persisted):
  //   query       – free text, matched against title + description
  //   labelIds    – cards must carry at least one of these labels
  //   assignees   – card's assignee must be one of these names
  var state = { query: "", labelIds: [], assignees: [] };

  function isActive() {
    return !!(state.query.trim() || state.labelIds.length || state.assignees.length);
  }

  function snapshot() {
    return {
      query: state.query,
      labelIds: state.labelIds.slice(),
      assignees: state.assignees.slice()
    };
  }

  function cardMatches(card) {
    var q = state.query.trim().toLowerCase();
    if (q) {
      var inTitle = card.title.toLowerCase().indexOf(q) > -1;
      var inDesc = card.description.toLowerCase().indexOf(q) > -1;
      if (!inTitle && !inDesc) return false;
    }
    if (state.labelIds.length) {
      var hasLabel = card.labelIds.some(function (id) {
        return state.labelIds.indexOf(id) > -1;
      });
      if (!hasLabel) return false;
    }
    if (state.assignees.length) {
      var a = card.assignee.trim();
      if (!a || state.assignees.indexOf(a) === -1) return false;
    }
    return true;
  }

  // Returns the ordered ids of cards in `column` that should be rendered.
  function visibleCardIds(column) {
    if (!isActive()) return column.cardIds.slice();
    return column.cardIds.filter(function (id) {
      var c = RAI.store.getCard(id);
      return !!c && !c.archived && cardMatches(c);
    });
  }

  // Total cards matching the current filters across the whole board.
  function totalMatchCount() {
    var n = 0;
    RAI.store.visibleColumns().forEach(function (col) {
      n += visibleCardIds(col).length;
    });
    return n;
  }

  function setQuery(q) { state.query = q == null ? "" : String(q); }

  function toggleLabel(id) {
    var i = state.labelIds.indexOf(id);
    if (i > -1) state.labelIds.splice(i, 1); else state.labelIds.push(id);
  }

  function toggleAssignee(name) {
    var i = state.assignees.indexOf(name);
    if (i > -1) state.assignees.splice(i, 1); else state.assignees.push(name);
  }

  function clearAll() {
    state.query = "";
    state.labelIds.length = 0;
    state.assignees.length = 0;
  }

  RAI.filters = {
    isActive: isActive,
    snapshot: snapshot,
    visibleCardIds: visibleCardIds,
    totalMatchCount: totalMatchCount,
    setQuery: setQuery,
    toggleLabel: toggleLabel,
    toggleAssignee: toggleAssignee,
    clearAll: clearAll
  };
})();