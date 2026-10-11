# rel.ai

A small, polished Kanban board for personal task management.

Built with **vanilla HTML, CSS and JavaScript only** — no frameworks, no build step,
no dependencies. All data lives in your browser's `localStorage`, so the app works
completely offline once loaded.

## Running the app

**Option 1 — open the file (simplest).**
Double-click `index.html` (or drag it into a browser tab). Everything runs from
`file://`, no server needed.

**Option 2 — any static server (optional, if you prefer `http://`).**

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then visit the printed URL. There is nothing to install and nothing to build —
any static file host works.

## Features

**Board & columns**
- Starts with **To Do / In Progress / Done** (the third column is marked as a
  "done" column, so cards in it show a green checkmark badge).
- Add columns (dashed button at the end of the board), rename inline
  (double-click the title or use the ⋯ menu), reorder by **dragging the grip
  handle** on the left of each column header, or via *Move left / Move right*
  in the ⋯ menu.
- Any column can be toggled as a "done" column (⋯ menu → *Show/Hide completion
  checkmark*), which puts the check indicator on its cards.

**Cards**
- Click **Add card** under any column, or click an existing card to edit it.
- Each card has: **title** (required), plain-text **description**, one or more
  colour-coded **labels**, and an optional **assignee** name.
- Labels are created on the fly in the card editor (*New label* → pick a name
  and a colour) and can be toggled per card. Label colours are used everywhere,
  including filters.
- Drag cards between columns and reorder within a column (a dashed placeholder
  shows the drop position; lists and the board auto-scroll near edges).
- The card editor also has keyboard **move buttons** (◀ ▲ ▼ ▶) so everything is
doable without dragging, plus a dropdown to move a card to another column.

**Archiving (soft delete)**
- Cards can be archived from their edit dialog; columns from the ⋯ menu.
- Everything you archive goes to the **archive panel** (top-right icon). There
  you can *Restore* items back onto the board or *Delete forever* for real.
- Restoring a card whose original column is gone lets you pick which live
  column it goes into.

**What happens when I delete a column?**
This app never silently destroys work:
- A column **with cards** is offered to be **archived** (default action) — the
  column and all of its cards move to the archive together and can be restored
  as a unit. A *Delete forever* option is available in the same dialog if you
  really want it gone.
- A column **without cards** is deleted outright, but only after a confirm
dialog. Restoring an archived column brings its cards back with it.

**Search & filtering**
- The search box matches card **title and description** (live).
- The **Labels** and **Assignee** buttons open multi-select filter menus with
  checkmarks; you can combine all three at once — search + label + assignee are
  ANDed, and multiple labels/assignees within one filter are ORed.
- A *Clear filters* button appears whenever any filter is active, and each
  column shows a "No matching cards" hint (instead of looking empty) when a
  filter hides its contents. If nothing on the whole board matches, a floating
  "No results" pill with a clear action is shown.

**Theme**
- Dark / light toggle in the top bar, macOS-style styling, preference persisted
  across reloads. The app boots with your saved theme (no flash).

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `/` or `Ctrl/⌘+K` | Focus the search box |
| `Esc` | Close menus / modals / archive panel |
| `Enter` / `Space` on a focused card | Open the card |
| `Enter` / `Esc` in inline rename inputs | Commit / cancel |

## Data & storage

Two keys in `localStorage`:
- `rel.ai.board.v1` — the whole board: columns (order, titles, done flag, card
  order), cards (title, description, label ids, assignee, archive state) and
  labels. Saved on every change.
- `rel.ai.theme` — `"light"` or `"dark"`.

To start over from scratch: open DevTools → Console and run
`RAI.store.reset()` (or clear site data). Filter selections are intentionally
**not** persisted — they're session state.

## Code structure

```
index.html          Entry point. Loads theme before first paint, then the
                    scripts in dependency order: config → utils → store →
                    filters → dnd → ui → app.
css/styles.css      All styling. Theme tokens live on html[data-theme];
                    components reference them via CSS variables.
js/config.js        Constants: storage keys, default columns, label palette.
js/utils.js         Small helpers: id generation, HTML escaping, initials,
                    relative timestamps.
js/store.js         State + persistence. Owns the board data shape, every
                    mutation (add/rename/move/archive/restore/delete for
                    columns, cards and labels) and localStorage save/load.
                    Emits a change event after each commit.
js/filters.js      Search + label + assignee filter state and the matching
                    logic (which card ids are visible per column).
js/dnd.js          Drag & drop. Cards: live placeholder inside .cards lists,
                    drop resolves target column + insertion index. Columns:
                    grip-handle drag with an indicator bar for the new slot.
                    Both auto-scroll near edges. No external libraries.
js/ui.js           DOM/rendering layer: board rendering, toolbar state,
                    dropdown menus, card editor modal, confirm dialogs,
                    archive slide-over, toasts, theme toggle, keyboard wiring.
                    Re-renders from store data on every change (subscribed
                    in app.js).
js/app.js          Boot: load persisted state, wire UI + DnD, subscribe the
                    renderer to store changes, show a warning if storage is
                    unavailable.
```

**How the pieces talk:** `store` is the single source of truth. UI actions call
store methods; every store mutation ends in `commit()` (save + emit). The
renderer subscribes once and re-renders the board, toolbar badges and (if open)
the archive panel from state. Filters are read-only query state consulted during
rendering. DnD is event-driven DOM manipulation during a drag and commits exactly
one store call on drop.

## Notes & limitations

- Persistence uses `localStorage`, so data is per-browser, per-origin and capped
  (~5 MB) — plenty for personal use, but don't expect it to sync across devices.
- Drag & drop uses the native HTML5 API (mouse/trackpad); on touch-only screens,
  use the card editor's move buttons instead.
- No accounts, no backend, no real-time sync — by design.
