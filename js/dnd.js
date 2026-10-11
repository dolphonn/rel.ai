(function () {
  "use strict";
  window.RAI = window.RAI || {};

  // Drag & drop for two gestures, both built on the native HTML5 DnD API:
  //   * cards  – dragstart on a card; live placeholder inside .cards lists;
  //              drop resolves the target column + insertion index.
  //   * columns– dragstart on a column's grip handle; an indicator bar shows
  //              where the column will land (left/right of hovered column,
  //              or at the end of the board).
  var PLACEHOLDER_CLASS = "card-placeholder";
  var boardEl = null;
  var drag = null;              // { type: "card" | "column", id }
  var placeholder = null;       // <div class="card-placeholder">
  var indicator = null;         // <div class="col-indicator">
  var pendingColumnDrop = null; // { colId, side } | { end: true }

  function init() {
    boardEl = document.getElementById("board");
    boardEl.addEventListener("dragover", onDragOver);
    boardEl.addEventListener("drop", onDrop);
  }

  function hostEl(e) {
    return e.target && e.target.nodeType === 1 ? e.target : null;
  }

  // Re-attach per-element drag listeners after every board render.
  function bindCards() {
    if (!boardEl) return;
    boardEl.querySelectorAll(".card[data-id]").forEach(function (el) {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", function (e) { onCardDragStart(e, el); });
      el.addEventListener("dragend", cleanup);
    });
    boardEl.querySelectorAll("[data-col-grip]").forEach(function (el) {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", function (e) {
        onColumnDragStart(e, el.closest(".column"));
      });
      el.addEventListener("dragend", cleanup);
    });
  }

  /* ---------- card dragging ---------- */

  function onCardDragStart(e, el) {
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", el.dataset.id); } catch (err) {}
    drag = { type: "card", id: el.dataset.id };
    placeholder = document.createElement("div");
    placeholder.className = PLACEHOLDER_CLASS;
    placeholder.style.minHeight = el.offsetHeight + "px";
    requestAnimationFrame(function () { el.classList.add("dragging"); });
  }

  function handleCardDragOver(el, e) {
    var colEl = el ? el.closest(".column") : null;
    clearDropTargets();
    if (!colEl) return;
    var list = colEl.querySelector(".cards");
    if (!list) return;
    colEl.classList.add("drop-target");
    positionPlaceholder(list, e.clientY);
    autoScrollList(list, e.clientY);
    autoScrollBoard(e.clientX);
  }

  function positionPlaceholder(list, y) {
    var cards = Array.prototype.slice.call(list.querySelectorAll(".card:not(.dragging)"));
    var afterEl = null;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { afterEl = cards[i]; break; }
    }
    // Skip DOM churn when nothing changed.
    if (placeholder.parentNode === list && placeholder.nextElementSibling === afterEl) return;
    if (afterEl) list.insertBefore(placeholder, afterEl);
    else list.appendChild(placeholder);
  }

  /* ---------- column dragging ---------- */

  function onColumnDragStart(e, colEl) {
    if (!colEl) return;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", colEl.dataset.id); } catch (err) {}
    drag = { type: "column", id: colEl.dataset.id };
  }

  function handleColumnDragOver(el, e) {
    pendingColumnDrop = null;
    clearIndicator();
    var colEl = el ? el.closest(".column") : null;
    if (colEl && colEl.dataset.id !== drag.id) {
      var r = colEl.getBoundingClientRect();
      var side = e.clientX < r.left + r.width / 2 ? "left" : "right";
      pendingColumnDrop = { colId: colEl.dataset.id, side: side };
      showIndicator(colEl, side);
    } else if (!colEl) {
      maybeShowEndIndicator(e.clientX);
    }
    autoScrollBoard(e.clientX);
  }

  function maybeShowEndIndicator(x) {
    var cols = Array.prototype.slice.call(boardEl.querySelectorAll(".column"));
    if (!cols.length) return;
    var last = cols[cols.length - 1];
    var r = last.getBoundingClientRect();
    if (x > r.right - 12) {
      pendingColumnDrop = { end: true };
      showIndicator(last, "right");
    }
  }

  function showIndicator(colEl, side) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "col-indicator";
      boardEl.appendChild(indicator);
    }
    var br = boardEl.getBoundingClientRect();
    var cr = colEl.getBoundingClientRect();
    var left = (side === "left" ? cr.left - 6 : cr.right + 2) - br.left + boardEl.scrollLeft;
    indicator.style.left = left + "px";
    indicator.style.top = (cr.top - br.top + boardEl.scrollTop + 8) + "px";
    indicator.style.height = Math.max(cr.height - 16, 40) + "px";
  }

  function clearIndicator() {
    if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    indicator = null;
  }

  /* ---------- shared drag plumbing ---------- */

  function onDragOver(e) {
    if (!drag) return;
    var el = hostEl(e);
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (drag.type === "card") handleCardDragOver(el, e);
    else handleColumnDragOver(el, e);
  }

  function clearDropTargets() {
    if (!boardEl) return;
    boardEl.querySelectorAll(".drop-target").forEach(function (el) {
      el.classList.remove("drop-target");
    });
  }

  function onDrop(e) {
    if (!drag) return;
    e.preventDefault();
    var d = drag;
    if (d.type === "card") {
      var list = placeholder && placeholder.parentNode;
      if (list && list.classList && list.classList.contains("cards")) {
        var colEl = list.closest(".column");
        var next = placeholder.nextElementSibling;
        var beforeId = next && next.classList && next.classList.contains("card")
          ? next.dataset.id
          : null;
        RAI.store.moveCard(d.id, colEl.dataset.id, beforeId);
      }
    } else if (d.type === "column" && pendingColumnDrop) {
      var cols = RAI.store.visibleColumns();
      var beforeId = null;
      if (!pendingColumnDrop.end) {
        if (pendingColumnDrop.side === "left") {
          beforeId = pendingColumnDrop.colId;
        } else {
          var idx = -1;
          for (var i = 0; i < cols.length; i++) {
            if (cols[i].id === pendingColumnDrop.colId) { idx = i; break; }
          }
          beforeId = idx > -1 && idx < cols.length - 1 ? cols[idx + 1].id : null;
        }
      }
      RAI.store.moveColumn(d.id, beforeId);
    }
    cleanup();
  }

  function cleanup() {
    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    placeholder = null;
    clearIndicator();
    pendingColumnDrop = null;
    if (boardEl) {
      boardEl.querySelectorAll(".dragging").forEach(function (el) {
        el.classList.remove("dragging");
      });
      clearDropTargets();
    }
    drag = null;
  }

  /* ---------- auto-scroll while dragging near edges ---------- */

  function autoScrollList(list, y) {
    var r = list.getBoundingClientRect();
    if (y - r.top < 36) list.scrollTop -= 8;
    else if (r.bottom - y < 36) list.scrollTop += 8;
  }

  function autoScrollBoard(x) {
    var r = boardEl.getBoundingClientRect();
    if (x > r.right - 48) boardEl.scrollLeft += 10;
    else if (x < r.left + 48 && boardEl.scrollLeft > 0) boardEl.scrollLeft -= 10;
  }

  RAI.dnd = { init: init, bindCards: bindCards, cleanup: cleanup };
})();