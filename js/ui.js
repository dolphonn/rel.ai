(function () {
  "use strict";
  window.RAI = window.RAI || {};

  var cfg = RAI.config;
  var U = RAI.utils;
  var store = RAI.store;
  var filters = RAI.filters;

  var els = {};
  var menu = null;        // { el, anchor }
  var archiveOpen = false;

  /* ---------- inline SVG icons (stroke-based, inherits currentColor) ---------- */

  var ICONS = {
    plus: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    plusSm: '<svg class="icon" viewBox="0 0 24 24" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>',
    dots: '<svg class="icon" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    checkSm: '<svg class="icon" viewBox="0 0 24 24" width="12" height="12" style="stroke-width:3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    pencil: '<svg class="icon" viewBox="0 0 24 24"><path d="M16.8 3.7a2.4 2.4 0 0 1 3.4 3.4L8.5 18.8l-4.7 1.4 1.4-4.7L16.8 3.7z"/></svg>',
    trashSm: '<svg class="icon" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>',
    restoreSm: '<svg class="icon" viewBox="0 0 24 24" width="14" height="14"><path d="M4 10a8 8 0 1 1 2.3 5.7M4 10V4m0 6h6"/></svg>',
    grip: '<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>',
    board: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>',
    archive: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5"/><path d="M10 13h4"/></svg>',
    "arrow-left": '<svg class="icon" viewBox="0 0 24 24"><path d="M19 12H5m6-7L4 12l7 7"/></svg>',
    "arrow-up": '<svg class="icon" viewBox="0 0 24 24"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>',
    "arrow-down": '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14m7-7l-7 7-7-7"/></svg>',
    "arrow-right": '<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14m-6 7l7-7-7-7"/></svg>'
  };

  /* ---------- init ---------- */

  function init() {
    cacheEls();
    wireTopbar();
    wireBoardEvents();
    wireArchivePanel();
    wireGlobalKeys();
  }

  function cacheEls() {
    els.searchInput = document.getElementById("search-input");
    els.filterLabelsBtn = document.getElementById("filter-labels-btn");
    els.filterAssigneesBtn = document.getElementById("filter-assignees-btn");
    els.filterLabelsCount = document.getElementById("filter-labels-count");
    els.filterAssigneesCount = document.getElementById("filter-assignees-count");
    els.clearFiltersBtn = document.getElementById("clear-filters-btn");
    els.archiveBtn = document.getElementById("archive-btn");
    els.archiveCount = document.getElementById("archive-count");
    els.themeToggle = document.getElementById("theme-toggle");
    els.board = document.getElementById("board");
    els.noResults = document.getElementById("no-results");
    els.noResultsClear = document.getElementById("no-results-clear");
    els.modalRoot = document.getElementById("modal-root");
    els.menuRoot = document.getElementById("menu-root");
    els.toastRoot = document.getElementById("toast-root");
    els.archiveBackdrop = document.getElementById("archive-backdrop");
    els.archivePanel = document.getElementById("archive-panel");
    els.archiveClose = document.getElementById("archive-close");
    els.archiveBody = document.getElementById("archive-body");
  }

  /* ---------- top bar wiring ---------- */

  function wireTopbar() {
    els.searchInput.addEventListener("input", function () {
      filters.setQuery(els.searchInput.value);
      renderBoard();
    });
    els.filterLabelsBtn.addEventListener("click", function () { openLabelsMenu(this); });
    els.filterAssigneesBtn.addEventListener("click", function () { openAssigneesMenu(this); });
    els.clearFiltersBtn.addEventListener("click", clearFilters);
    els.archiveBtn.addEventListener("click", openArchive);
    els.themeToggle.addEventListener("click", toggleTheme);
  }

  /* ---------- board wiring (delegated) ---------- */

  function wireBoardEvents() {
    els.board.addEventListener("click", function (e) {
      var t = e.target;
      var addBtn = t.closest("[data-add-card]");
      if (addBtn) { openCardModal(null, addBtn.dataset.addCard); return; }
      var menuBtn = t.closest("[data-col-menu]");
      if (menuBtn) { openColumnMenu(menuBtn, menuBtn.dataset.colMenu); return; }
      if (t.closest("[data-add-column]")) { beginAddColumn(); return; }
      if (t.closest("[data-new-column-primary]")) { beginAddColumn(); return; }
      var cardEl = t.closest(".card[data-id]");
      if (cardEl) openCardModal(cardEl.dataset.id);
    });

    els.board.addEventListener("dblclick", function (e) {
      var titleEl = e.target.closest("[data-col-title]");
      if (titleEl) beginRename(titleEl.dataset.colTitle);
    });

    // Keyboard access: Enter/Space on a focused card opens it.
    els.board.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("card")) {
        e.preventDefault();
        openCardModal(e.target.dataset.id);
      }
    });
  }

  /* ---------- global keys ---------- */

  function wireGlobalKeys() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (menu) closeMenu();
        else if (archiveOpen) closeArchive();
        else if (els.modalRoot.children.length) closeModals();
        return;
      }
      var ae = document.activeElement;
      var typing = !!(ae && /^(input|textarea|select)$/i.test(ae.tagName));
      if (typing) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) {
        e.preventDefault();
        els.searchInput.focus();
        els.searchInput.select();
      }
    });
  }

  /* ---------- board rendering ---------- */

  function renderAll() {
    renderBoard();
    updateToolbarState();
    if (archiveOpen) renderArchiveBody();
  }

  function renderBoard() {
    var labelsById = store.labelsById();
    var cols = store.visibleColumns();
    var html;
    if (!cols.length) {
      html = emptyBoardHtml();
    } else {
      html = cols.map(function (col) { return columnHtml(col, labelsById); }).join("") + addColumnGhostHtml();
    }
    els.board.innerHTML = html;
    RAI.dnd.bindCards();
    var active = filters.isActive();
    els.noResults.hidden = !(active && filters.totalMatchCount() === 0);
  }

  function columnHtml(col, labelsById) {
    var allCards = store.columnCards(col.id);
    var visibleIds = filters.visibleCardIds(col);
    var cardsHtml = visibleIds.map(function (id) {
      return cardHtml(store.getCard(id), labelsById, col.done);
    }).join("");
    if (!visibleIds.length) {
      cardsHtml = '<div class="list-hint">' + (allCards.length ? "No matching cards" : "No cards yet") + "</div>";
    }
    return '<section class="column" data-id="' + U.esc(col.id) + '">'
      + '<header class="col-head">'
      +   '<button type="button" class="grip" data-col-grip title="Drag to reorder column" aria-label="Reorder ' + U.esc(col.title) + '">' + ICONS.grip + "</button>"
      +   '<h3 class="col-title" data-col-title="' + U.esc(col.id) + '" title="' + U.esc(col.title) + '">' + U.esc(col.title) + "</h3>"
      +   '<span class="col-count">' + allCards.length + "</span>"
      +   '<button type="button" class="icon-btn col-menu-btn" data-col-menu="' + U.esc(col.id) + '" title="Column options" aria-label="Options for ' + U.esc(col.title) + '">' + ICONS.dots + "</button>"
      + "</header>"
      + '<div class="cards">' + cardsHtml + "</div>"
      + '<button type="button" class="add-card-btn" data-add-card="' + U.esc(col.id) + '">' + ICONS.plusSm + " Add card</button>"
      + "</section>";
  }

  function cardHtml(card, labelsById, done) {
    if (!card) return "";
    var chips = card.labelIds.map(function (id) {
      var l = labelsById[id];
      return l
        ? '<span class="chip-label"><span class="dot" style="background:' + U.esc(l.color) + '"></span>' + U.esc(l.name) + "</span>"
        : "";
    }).join("");
    var check = done ? '<span class="done-badge" title="Completed">' + ICONS.checkSm + "</span>" : "";
    var top = (chips || check) ? '<div class="card-top">' + chips + check + "</div>" : "";
    var desc = card.description
      ? '<p class="card-desc">' + U.esc(card.description) + "</p>"
      : "";
    var assignee = card.assignee.trim()
      ? '<div class="card-foot"><span class="avatar" title="' + U.esc(card.assignee) + '">' + U.esc(U.initials(card.assignee)) + '</span><span class="assignee-name">' + U.esc(card.assignee) + "</span></div>"
      : "";
    return '<article class="card" data-id="' + U.esc(card.id) + '" tabindex="0" role="button" aria-label="' + U.esc(card.title) + '">'
      + top
      + '<h4 class="card-title">' + U.esc(card.title) + "</h4>"
      + desc
      + assignee
      + "</article>";
  }

  function emptyBoardHtml() {
    return '<div class="board-empty">'
      + '<div class="board-empty-icon">' + ICONS.board + "</div>"
      + "<h3>Your board is empty</h3>"
      + "<p>Start with the classic three columns, or create your own.</p>"
      + '<button type="button" class="btn primary" data-new-column-primary>Create To Do / In Progress / Done</button>'
      + '</div>';
  }

  function addColumnGhostHtml() {
    return '<button type="button" class="add-column" data-add-column>' + ICONS.plusSm + " Add column</button>";
  }

  /* ---------- toolbar state ---------- */

  function updateToolbarState() {
    var snap = filters.snapshot();
    setBadge(els.filterLabelsCount, snap.labelIds.length);
    setBadge(els.filterAssigneesCount, snap.assignees.length);
    els.filterLabelsBtn.classList.toggle("active", snap.labelIds.length > 0);
    els.filterAssigneesBtn.classList.toggle("active", snap.assignees.length > 0);
    var active = filters.isActive();
    els.clearFiltersBtn.hidden = !active;
    if (els.searchInput.value !== snap.query) els.searchInput.value = snap.query;
    setBadge(els.archiveCount, store.archivedCards().length + store.archivedColumns().length);
  }

  function setBadge(el, n) {
    el.hidden = n <= 0;
    if (n > 0) el.textContent = n > 99 ? "99+" : String(n);
  }

  function clearFilters() {
    filters.clearAll();
    renderBoard();
    updateToolbarState();
  }

  /* ---------- dropdown menus ---------- */

  function openMenu(anchor, itemsBuilder) {
    closeMenu();
    var m = document.createElement("div");
    m.className = "menu";
    els.menuRoot.appendChild(m);
    menu = { el: m, anchor: anchor };
    var lastItems = [];

    function render() {
      lastItems = itemsBuilder();
      m.innerHTML = lastItems.map(function (it, i) {
        if (it.divider) return '<div class="menu-sep"></div>';
        var cls = "menu-item" + (it.danger ? " danger" : "") + (it.disabled ? " disabled" : "");
        var check = it.checked ? '<span class="menu-check">' + ICONS.checkSm + "</span>" : "<span class=\"menu-check\"></span>";
        var dot = it.dotColor
          ? '<span class="dot" style="background:' + U.esc(it.dotColor) + '"></span>'
          : "";
        var icon = it.icon ? '<span class="menu-icon">' + it.icon + "</span>" : "";
        return '<button type="button" class="' + cls + '" data-menu-item="' + i + '">'
          + check + dot + icon
          + '<span class="menu-label">' + U.esc(it.label) + "</span></button>";
      }).join("");
      m.querySelectorAll("[data-menu-item]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var item = lastItems[Number(btn.dataset.menuItem)];
          if (!item || item.disabled || item.divider) return;
          if (!item.keepOpen) closeMenu();
          if (item.onSelect) item.onSelect();
        });
      });
    }

    render();
    // Position near the anchor; flip above when there's no room below.
    var r = anchor.getBoundingClientRect();
    m.style.left = "0px";
    m.style.top = "0px";
    var mw = m.offsetWidth, mh = m.offsetHeight;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8));
    var top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + "px";
    m.style.top = top + "px";

    menu.refresh = render;
  }

  function closeMenu() {
    if (!menu) return;
    var m = menu.el;
    if (m.parentNode) m.parentNode.removeChild(m);
    document.removeEventListener("mousedown", handleMenuOutside, true);
    menu = null;
  }

  function handleMenuOutside(e) {
    if (!menu) return;
    if (menu.el.contains(e.target) || menu.anchor.contains(e.target)) return;
    closeMenu();
  }

  // Open a menu and keep it open after item clicks (used by filters).
  function openFilterMenu(anchor, itemsBuilder) {
    openMenu(anchor, itemsBuilder);
    document.addEventListener("mousedown", handleMenuOutside, true);
  }

  function openLabelsMenu(anchor) {
    openFilterMenu(anchor, function () {
      var labels = store.getState().labels;
      var snap = filters.snapshot();
      if (!labels.length) {
        return [{ label: "No labels yet — create one on a card", disabled: true }];
      }
      var items = labels.map(function (l) {
        return {
          label: l.name,
          dotColor: l.color,
          checked: snap.labelIds.indexOf(l.id) > -1,
          keepOpen: true,
          onSelect: function () {
            filters.toggleLabel(l.id);
            renderBoard();
            updateToolbarState();
            if (menu) menu.refresh();
          }
        };
      });
      items.push({ divider: true });
      items.push({ label: "Clear label filter", disabled: !snap.labelIds.length, keepOpen: true, onSelect: function () {
        filters.clearAll();
        // clearAll wipes the query too — restore it
        filters.setQuery(snap.query);
        renderBoard();
        updateToolbarState();
        if (menu) menu.refresh();
      }});
      return items;
    });
  }

  function openAssigneesMenu(anchor) {
    openFilterMenu(anchor, function () {
      var names = store.allAssignees();
      var snap = filters.snapshot();
      if (!names.length) {
        return [{ label: "No assignees yet — set one on a card", disabled: true }];
      }
      var items = names.map(function (n) {
        return {
          label: n,
          checked: snap.assignees.indexOf(n) > -1,
          keepOpen: true,
          onSelect: function () {
            filters.toggleAssignee(n);
            renderBoard();
            updateToolbarState();
            if (menu) menu.refresh();
          }
        };
      });
      items.push({ divider: true });
      items.push({ label: "Clear assignee filter", disabled: !snap.assignees.length, keepOpen: true, onSelect: function () {
        filters.clearAll();
        filters.setQuery(snap.query);
        renderBoard();
        updateToolbarState();
        if (menu) menu.refresh();
      }});
      return items;
    });
  }

  /* ---------- column operations ---------- */

  function openColumnMenu(anchorBtn, colId) {
    openMenu(anchorBtn, function () {
      var col = store.getColumn(colId);
      if (!col) return [{ label: "Unavailable", disabled: true }];
      var cols = store.visibleColumns();
      var idx = -1;
      for (var i = 0; i < cols.length; i++) if (cols[i].id === colId) { idx = i; break; }
      var nCards = store.activeColumnCards(colId).length;
      return [
        { label: "Rename", icon: ICONS.pencil, onSelect: function () { beginRename(colId); } },
        { label: "Move left", disabled: idx <= 0, onSelect: function () { moveColStep(colId, -1); } },
        { label: "Move right", disabled: idx === cols.length - 1, onSelect: function () { moveColStep(colId, 1); } },
        { divider: true },
        {
          label: col.done ? "Hide completion checkmark" : "Show completion checkmark",
          checked: col.done,
          keepOpen: false,
          onSelect: function () { store.setColumnDone(colId, !col.done); }
        },
        { divider: true },
        {
          label: nCards > 0 ? "Archive column\u2026" : "Delete column\u2026",
          danger: false,
          onSelect: function () { confirmColumnDelete(colId); }
        }
      ];
    });
    document.addEventListener("mousedown", handleMenuOutside, true);
  }

  function moveColStep(colId, dir) {
    var cols = store.visibleColumns();
    var i = -1;
    for (var k = 0; k < cols.length; k++) if (cols[k].id === colId) { i = k; break; }
    if (i < 0) return;
    var target = cols[i + dir];
    if (!target) return;
    var beforeId = dir < 0
      ? target.id
      : (cols[i + dir + 1] ? cols[i + dir + 1].id : null);
    store.moveColumn(colId, beforeId);
  }

  function confirmColumnDelete(colId) {
    var col = store.getColumn(colId);
    if (!col) return;
    var nCards = store.activeColumnCards(colId).length;
    openConfirm({
      title: nCards > 0 ? 'Archive "' + U.esc(col.title) + '"?' : 'Delete "' + U.esc(col.title) + '"?',
      body: nCards > 0
        ? "The column and its " + nCards + " card" + (nCards === 1 ? "" : "s") + " will be moved to the archive, where you can restore them later."
        : "This empty column will be removed permanently.",
      leftActions: nCards > 0
        ? [{ label: "Delete forever", kind: "danger-ghost", run: function () {
            store.deleteColumnForever(colId);
            toast("Column deleted forever");
          }}]
        : [],
      actions: [
        { label: "Cancel", kind: "ghost" },
        nCards > 0
          ? { label: "Archive", kind: "primary", run: function () {
              store.archiveColumn(colId);
              toast("\u201C" + col.title + "\u201D archived — find it in the archive panel");
            }}
          : { label: "Delete", kind: "danger", run: function () {
              store.deleteColumnForever(colId);
              toast("Column deleted");
            }}
      ]
    });
  }

  function beginRename(colId) {
    var titleEl = null;
    els.board.querySelectorAll("[data-col-title]").forEach(function (el) {
      if (el.dataset.colTitle === colId) titleEl = el;
    });
    if (!titleEl || titleEl.querySelector("input")) return;
    var col = store.getColumn(colId);
    if (!col) return;
    var input = document.createElement("input");
    input.className = "col-title-input";
    input.value = col.title;
    input.maxLength = 60;
    titleEl.textContent = "";
    titleEl.appendChild(input);
    var finished = false;
    function finish(save) {
      if (finished) return; finished = true;
      var v = input.value.trim();
      if (save && v && v !== col.title) store.renameColumn(colId, v);
      else renderBoard();
    }
    input.focus();
    input.select();
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
      e.stopPropagation();
    });
    input.addEventListener("blur", function () { finish(true); });
  }

  function beginAddColumn() {
    var board = els.board;
    var ghost = board.querySelector("[data-add-column]");
    var wrap = document.createElement("div");
    wrap.className = "add-column-slot";
    var input = document.createElement("input");
    input.className = "col-title-input add-col-input";
    input.placeholder = "Column name";
    input.maxLength = 60;
    wrap.appendChild(input);
    if (ghost) ghost.replaceWith(wrap); else board.appendChild(wrap);
    var finished = false;
    function finish(save) {
      if (finished) return; finished = true;
      var title = input.value.trim();
      if (save && title) { store.addColumn(title); toast("Column added"); }
      else renderBoard();
    }
    input.focus();
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") finish(true);
      else if (e.key === "Escape") finish(false);
      e.stopPropagation();
    });
    input.addEventListener("blur", function () { finish(true); });
  }

  /* ---------- card modal ---------- */

  function fieldHtml(label, inner) {
    return '<div class="field"><span class="field-label">' + label + "</span>" + inner + "</div>";
  }

  function moveBtnHtml(dir, iconKey, title) {
    return '<button type="button" class="move-btn" data-move="' + dir + '" title="' + title + '">' + ICONS[iconKey] + "</button>";
  }

  function openCardModal(cardId, defaultColumnId) {
    closeMenu();
    closeModals();
    var cols = store.visibleColumns();
    if (!cols.length) { toast("Create a column first"); return; }
    var isNew = !cardId;
    var card = isNew ? null : store.getCard(cardId);
    if (!isNew && (!card || card.archived)) return;

    var currentColId = card ? card.columnId : (defaultColumnId || cols[0].id);
    var cur = store.getColumn(currentColId);
    if (!cur || cur.archived) currentColId = cols[0].id;

    var selectedLabels = {};
    (card ? card.labelIds : []).forEach(function (id) { selectedLabels[id] = true; });

    var wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML =
      '<div class="modal card-modal" role="dialog" aria-modal="true">'
      +   '<form id="card-form">'
      +     "<h2>" + (isNew ? "New card" : "Edit card") + "</h2>"
      +     fieldHtml("Title", '<input class="input" name="title" required maxlength="140" placeholder="What needs doing?" value="' + U.esc(card ? card.title : "") + '" />')
      +     fieldHtml("Description", '<textarea class="input" name="description" rows="4" placeholder="Add a bit more detail\u2026">' + U.esc(card ? card.description : "") + "</textarea>")
      +     '<div class="field"><span class="field-label">Labels</span>'
      +       '<div class="chips" id="chip-row"></div>'
      +       '<div class="new-label-row" id="new-label-row" hidden>'
      +         '<input class="input new-label-input" name="newLabelName" placeholder="Label name" maxlength="30" />'
      +         '<div class="swatches" id="swatch-row">' + cfg.LABEL_COLORS.map(function (c, i) {
            return '<button type="button" class="swatch' + (i === 0 ? " selected" : "") + '" data-color="' + c.value + '" title="' + c.name + '" style="background:' + c.value + '"></button>';
          }).join("") + "</div>"
      +       "</div>"
      +     "</div>"
      +     fieldHtml("Assignee", '<input class="input" name="assignee" placeholder="e.g. Alex" maxlength="40" value="' + U.esc(card ? card.assignee : "") + '" />')
      +     fieldHtml("Column", '<select class="input" name="columnId">' + cols.map(function (c) {
            return '<option value="' + U.esc(c.id) + '"' + (c.id === currentColId ? " selected" : "") + ">" + U.esc(c.title) + "</option>";
          }).join("") + "</select>")
      +     (isNew ? "" :
        '<div class="field"><span class="field-label">Move</span><div class="move-row">'
        + moveBtnHtml("left", "arrow-left", "Move to previous column")
        + moveBtnHtml("up", "arrow-up", "Move up")
        + moveBtnHtml("down", "arrow-down", "Move down")
        + moveBtnHtml("right", "arrow-right", "Move to next column")
        + "</div></div>")
      +     '<div class="modal-foot">'
      +       (isNew ? "" : '<button type="button" class="btn danger-ghost" id="card-archive-btn">Archive</button>')
      +       '<span class="spacer"></span>'
      +       '<button type="button" class="btn ghost" id="card-cancel-btn">Cancel</button>'
      +       '<button type="submit" class="btn primary">' + (isNew ? "Add card" : "Save changes") + "</button>"
      +     "</div>"
      +   "</form>"
      + "</div>";
    els.modalRoot.appendChild(wrap);

    var form = wrap.querySelector("#card-form");
    var chipRow = wrap.querySelector("#chip-row");
    var newRow = wrap.querySelector("#new-label-row");
    var nameInput = wrap.querySelector(".new-label-input");
    var swatchRow = wrap.querySelector("#swatch-row");
    var chosenColor = cfg.LABEL_COLORS[0].value;

    function renderChips() {
      var labels = store.getState().labels;
      chipRow.innerHTML = labels.map(function (l) {
        return '<button type="button" class="chip' + (selectedLabels[l.id] ? " selected" : "") + '" data-chip="' + U.esc(l.id) + '">'
          + '<span class="dot" style="background:' + U.esc(l.color) + '"></span>' + U.esc(l.name) + "</button>";
      }).join("")
      + '<button type="button" class="chip chip-new" id="chip-add">' + ICONS.plusSm + " New label</button>";
    }

    function selectSwatch(color) {
      chosenColor = color;
      swatchRow.querySelectorAll(".swatch").forEach(function (s) {
        s.classList.toggle("selected", s.dataset.color === color);
      });
    }

    function showNewLabelRow(show) {
      newRow.hidden = !show;
      if (show) { nameInput.value = ""; selectSwatch(chosenColor); nameInput.focus(); }
    }

    function commitNewLabel() {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var label = store.createLabel(name, chosenColor);
      selectedLabels[label.id] = true;
      showNewLabelRow(false);
      renderChips();
    }

    chipRow.addEventListener("click", function (e) {
      if (e.target.closest("#chip-add")) { showNewLabelRow(true); return; }
      var chip = e.target.closest("[data-chip]");
      if (!chip) return;
      var id = chip.dataset.chip;
      if (selectedLabels[id]) delete selectedLabels[id]; else selectedLabels[id] = true;
      renderChips();
    });
    swatchRow.addEventListener("click", function (e) {
      var s = e.target.closest(".swatch");
      if (s) selectSwatch(s.dataset.color);
    });
    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); commitNewLabel(); }
      else if (e.key === "Escape") { e.stopPropagation(); showNewLabelRow(false); }
    });

    // Keyboard move buttons (existing cards only).
    if (!isNew) {
      function setMoveDisabled(dir, disabled) {
        var b = form.querySelector('[data-move="' + dir + '"]');
        if (b) b.disabled = disabled;
      }
      function updateMoveButtons() {
        var c2 = store.getCard(cardId);
        if (!c2) return;
        var cols2 = store.visibleColumns();
        var col2 = store.getColumn(c2.columnId);
        var visIds = col2.cardIds.filter(function (id) { var cc = store.getCard(id); return cc && !cc.archived; });
        var pos = visIds.indexOf(cardId);
        var ci = -1;
        for (var i = 0; i < cols2.length; i++) if (cols2[i].id === col2.id) { ci = i; break; }
        setMoveDisabled("up", pos <= 0);
        setMoveDisabled("down", pos < 0 || pos >= visIds.length - 1);
        setMoveDisabled("left", ci <= 0);
        setMoveDisabled("right", ci === cols2.length - 1);
      }
      form.querySelectorAll("[data-move]").forEach(function (b) {
        b.addEventListener("click", function () {
          store.moveCardByStep(cardId, b.dataset.move);
          var sel = form.querySelector('[name="columnId"]');
          var c2 = store.getCard(cardId);
          if (sel && c2) sel.value = c2.columnId;
          updateMoveButtons();
        });
      });
      updateMoveButtons();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Commit a half-filled "New label" row so the label is saved even when
      // the user clicks Save instead of pressing Enter in its name field.
      if (!newRow.hidden && nameInput.value.trim()) commitNewLabel();
      var fd = new FormData(form);
      var title = String(fd.get("title") || "").trim();
      if (!title) return;
      var targetColId = form.querySelector('[name="columnId"]').value;
      var payload = {
        title: title,
        description: String(fd.get("description") || ""),
        labelIds: Object.keys(selectedLabels),
        assignee: String(fd.get("assignee") || "")
      };
      if (isNew) {
        store.createCard(Object.assign({ columnId: targetColId }, payload));
        var colName = store.getColumn(targetColId);
        toast("Card added to " + (colName ? colName.title : "board"));
      } else {
        store.updateCard(cardId, payload);
        var fresh = store.getCard(cardId);
        if (fresh && targetColId !== fresh.columnId) store.moveCard(cardId, targetColId, null);
        toast("Changes saved");
      }
      closeModals();
    });

    wrap.querySelector("#card-cancel-btn").addEventListener("click", closeModals);
    var archBtn = wrap.querySelector("#card-archive-btn");
    if (archBtn) {
      archBtn.addEventListener("click", function () {
        store.archiveCard(cardId);
        toast((card.title || "Card") + " archived");
        closeModals();
      });
    }
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) closeModals(); });

    // Simple focus trap while the modal is open.
    wrap.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusables = Array.prototype.filter.call(
        wrap.querySelectorAll("button, input, select, textarea"),
        function (el) { return !el.disabled && el.getClientRects().length > 0; }
      );
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    renderChips();
    var titleInput = form.querySelector('input[name="title"]');
    if (titleInput) titleInput.focus();
  }

  /* ---------- confirm dialog ---------- */

  function openConfirm(opts) {
    closeModals();
    var wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    var leftHtml = (opts.leftActions || []).map(function (a, i) {
      return '<button type="button" class="btn ' + a.kind + '" data-left="' + i + '">' + U.esc(a.label) + "</button>";
    }).join("");
    var rightHtml = opts.actions.map(function (a, i) {
      return '<button type="button" class="btn ' + a.kind + '" data-right="' + i + '">' + U.esc(a.label) + "</button>";
    }).join("");
    wrap.innerHTML =
      '<div class="modal confirm-modal" role="dialog" aria-modal="true">'
      +   "<h2>" + opts.title + "</h2>"
      +   '<p class="confirm-body">' + opts.body + "</p>"
      +   '<div class="modal-foot">' + leftHtml + '<span class="spacer"></span>' + rightHtml + "</div>"
      + "</div>";
    els.modalRoot.appendChild(wrap);

    function runAction(list, idx) {
      var a = list[idx];
      closeModals();
      if (a && a.run) a.run();
    }
    wrap.querySelectorAll("[data-left]").forEach(function (b) {
      b.addEventListener("click", function () { runAction(opts.leftActions || [], Number(b.dataset.left)); });
    });
    wrap.querySelectorAll("[data-right]").forEach(function (b) {
      b.addEventListener("click", function () { runAction(opts.actions, Number(b.dataset.right)); });
    });
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) closeModals(); });
    var primary = wrap.querySelector(".btn.primary, .btn.danger");
    if (primary) primary.focus();
  }

  function closeModals() {
    while (els.modalRoot.children.length) els.modalRoot.removeChild(els.modalRoot.lastChild);
  }

  /* ---------- archive panel ---------- */

  function openArchive() {
    archiveOpen = true;
    renderArchiveBody();
    els.archiveBackdrop.hidden = false;
    requestAnimationFrame(function () { els.archivePanel.classList.add("open"); });
    els.archiveClose.focus();
  }

  function closeArchive() {
    archiveOpen = false;
    els.archivePanel.classList.remove("open");
    els.archiveBackdrop.hidden = true;
  }

  function isArchiveOpen() { return archiveOpen; }

  function wireArchivePanel() {
    els.archiveClose.addEventListener("click", closeArchive);
    els.archiveBackdrop.addEventListener("mousedown", function (e) {
      if (e.target === els.archiveBackdrop) closeArchive();
    });
    els.archiveBody.addEventListener("click", function (e) {
      var t = e.target;
      var b;
      if ((b = t.closest("[data-ap-restore-col]"))) {
        store.restoreColumn(b.dataset.apRestoreCol);
        toast("Column restored");
        return;
      }
      if ((b = t.closest("[data-ap-delete-col]"))) { confirmDeleteForever("column", b.dataset.apDeleteCol); return; }
      if ((b = t.closest("[data-ap-restore-card]"))) {
        var item = b.closest(".ap-item");
        var sel = item ? item.querySelector("[data-ap-target]") : null;
        store.restoreCard(b.dataset.apRestoreCard, sel ? sel.value : undefined);
        toast("Card restored");
        return;
      }
      if ((b = t.closest("[data-ap-delete-card]"))) { confirmDeleteForever("card", b.dataset.apDeleteCard); return; }
    });
  }

  function renderArchiveBody() {
    var cols = store.archivedColumns();
    var cards = store.archivedCards().slice().sort(function (a, b) {
      return (b.archivedAt || 0) - (a.archivedAt || 0);
    });
    if (!cols.length && !cards.length) {
      els.archiveBody.innerHTML =
        '<div class="ap-empty"><div class="ap-empty-icon">' + ICONS.archive + "</div>"
        + "<h3>Nothing archived yet</h3>"
        + "<p>Archived cards and columns land here, safe from permanent deletion.</p></div>";
      return;
    }
    var html = "";
    if (cols.length) {
      html += '<div class="ap-section">Columns \u00B7 ' + cols.length + "</div>";
      html += cols.map(archivedColumnHtml).join("");
    }
    if (cards.length) {
      html += '<div class="ap-section">Cards \u00B7 ' + cards.length + "</div>";
      html += cards.map(archivedCardHtml).join("");
    }
    els.archiveBody.innerHTML = html;
  }

  function archivedColumnHtml(col) {
    var n = 0;
    col.cardIds.forEach(function (id) { var c = store.getCard(id); if (c && c.archived) n++; });
    return '<div class="ap-item">'
      +   '<div class="ap-item-main">'
      +     '<div class="ap-item-title">' + U.esc(col.title) + "</div>"
      +     '<div class="ap-item-meta">' + n + (n === 1 ? " card" : " cards") + " \u00B7 archived " + U.esc(U.timeAgo(col.archivedAt)) + "</div>"
      +   "</div>"
      +   '<div class="ap-side"><div class="ap-actions-row">'
      +     '<button type="button" class="btn small primary-ghost" data-ap-restore-col="' + U.esc(col.id) + '">' + ICONS.restoreSm + " Restore</button>"
      +     '<button type="button" class="icon-btn danger-icon" title="Delete forever" data-ap-delete-col="' + U.esc(col.id) + '">' + ICONS.trashSm + "</button>"
      +   "</div></div>"
      + "</div>";
  }

  function archivedCardHtml(card) {
    var col = card.columnId ? store.getColumn(card.columnId) : null;
    var colAvailable = !!(col && !col.archived);
    var labelsById = store.labelsById();
    var dots = card.labelIds.map(function (id) {
      var l = labelsById[id];
      return l ? '<span class="dot" style="background:' + U.esc(l.color) + '" title="' + U.esc(l.name) + '"></span>' : "";
    }).join(" ");
    var colName = col ? col.title : "Unknown column";
    var cols = store.visibleColumns();
    var side = '<div class="ap-side">';
    if (!colAvailable && cols.length) {
      side += '<select class="input small-input" data-ap-target="' + U.esc(card.id) + '">'
        + cols.map(function (c) { return '<option value="' + U.esc(c.id) + '">' + U.esc(c.title) + "</option>"; }).join("")
        + "</select>";
    }
    if (!colAvailable && !cols.length) {
      side += '<span class="ap-hint">Create a column to restore this card</span>';
    }
    side += '<div class="ap-actions-row">'
      + (colAvailable || cols.length
        ? '<button type="button" class="btn small primary-ghost" data-ap-restore-card="' + U.esc(card.id) + '">' + ICONS.restoreSm + " Restore</button>"
        : "")
      + '<button type="button" class="icon-btn danger-icon" title="Delete forever" data-ap-delete-card="' + U.esc(card.id) + '">' + ICONS.trashSm + "</button>"
      + "</div></div>";
    return '<div class="ap-item">'
      +   '<div class="ap-item-main">'
      +     '<div class="ap-item-title">' + U.esc(card.title || "(untitled)") + "</div>"
      +     '<div class="ap-item-meta">' + dots + "<span>" + U.esc(colName) + "</span> \u00B7 archived " + U.esc(U.timeAgo(card.archivedAt)) + "</div>"
      +   "</div>" + side
      + "</div>";
  }

  function confirmDeleteForever(kind, id) {
    var item = kind === "column" ? store.getColumn(id) : store.getCard(id);
    var name = item ? (item.title || "(untitled)") : "item";
    openConfirm({
      title: 'Delete "' + U.esc(name) + '" forever?',
      body: kind === "column"
        ? "This permanently removes the column and its archived cards. This can\u2019t be undone."
        : "This permanently removes the card from the archive. This can\u2019t be undone.",
      actions: [
        { label: "Cancel", kind: "ghost" },
        {
          label: "Delete forever", kind: "danger",
          run: function () {
            if (kind === "column") store.deleteColumnForever(id);
            else store.deleteCardForever(id);
            toast("Deleted forever");
          }
        }
      ]
    });
  }

  /* ---------- theme + toasts ---------- */

  function toggleTheme() {
    var html = document.documentElement;
    var next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    store.setTheme(next);
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    els.toastRoot.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 350);
    }, 2400);
  }

  RAI.ui = {
    init: init,
    renderAll: renderAll,
    renderBoard: renderBoard,
    updateToolbarState: updateToolbarState,
    renderArchiveBody: renderArchiveBody,
    isArchiveOpen: isArchiveOpen,
    toast: toast
  };
})();