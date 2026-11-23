# Factory

A warm, near-black desk for agents: a sidebar of workstreams and sessions, a home screen asking “What should we work on?”, and a dusk rendered as a dot matrix that rises from the bottom-right corner.

![Factory](preview.png)

## Install

Copy `layouts/factory.json`, `layouts/factory.svg`, `themes/factory.json`, and the six `mods/factory-*` folders into their matching directories in `~/.config/herdr-app`. Merge the `layout:factory` section from `keys.json` into your existing bindings. Select Factory in Herdr, or run `herdr-app do layout.switch --name factory`.

## What you see

The window has no system title bar. On macOS, the native controls sit over the sidebar. Where Herdr expects the layout to draw window controls, Factory offers them in the expanded head and in More.

The sidebar is 268px of near-black `#0a0a0a`, four blocks of the same mod:

- **Head**, 46px: the sidebar toggle on the left, space ‹ › on the right. On macOS it starts 82px in, so the window buttons keep their place.
- **Nav**, 156px: five rows of 30px — Home, New session, Agents (with a working count and an orange dot when something needs you), Search, More.
- **Lists**: the section label `WORKSTREAMS` (10.5px, uppercase, `#918b86`), then one row per space at 30px: an 18px colour chip with the space's initial, the name, the machine when it is remote, the branch (not `main`), a status dot, and the age in Geist Mono. Then the sessions, grouped by recency — `TODAY`, `LAST 7 DAYS`, `LAST 30 DAYS`, `OLDER`, and `SETTLED · n` — each group foldable. The Sessions header keeps the filter and `+` visible. A session row is 28px: a 12px status gutter, the name (the tab's name, else the title of what runs in it, else its number), a `Z` when zoomed, the age, and controls to settle, restore, or close on hover.
- **Foot**, 60px: a teal circle with the user's initial, the user's name, an update dot when one waits, and the settings gear.

The work area is a stack of two blocks:

- **Home**: the dusk. A 2400×1400 halftone — a 12px grid of round dots whose size and colour follow a light field, so a plume of `#ff8a38` and pale orange rises from the bottom-right over `#070605`, with a fine dot texture across the rest. Above it, “What should we work on?” at 34px regular, then a composer card (680px wide, radius 10, `#0e0e0e`, hairline `#1f1f1f`, mono placeholder): a `+`, the agent pill (the chosen agent's icon, name and a chevron), the folder chip and a round `#ee6018` send button. Below the card, the machine picker shows where the session will start. The workstream chip appears when the target is the active workstream’s machine.
- **Work**: the shown tab's terminals as cards — 10px inset, 8px gap, radius 10, `#0e0e0e` on `#050505`, a 1px `#1f1f1f` border, and a 30px pane header that appears on hover (the shipped `pane` mod: icon, name, folder, status, split/zoom/close).

The right panel (Files or Changes, 368px, inset 10px) is a card of the same family and starts hidden.

The status line is 26px on `#050505`: machine, branch, agent count with a pulsing `#d8b64a` dot while agents work and an orange count when agents need attention, then one bordered segmented switch for Files and Changes, and the palette hint in Geist Mono.

Theme `factory` (dark only): canvas `#050505`, chrome `#0a0a0a`, cards and terminals `#0e0e0e`, border `#1f1f1f`, text `#f2f2f2`, muted `#a49d9a`, dim `#918b86`, accent `#ee6018`; working `#d8b64a`, done `#8fd18f`, blocked `#e2695a`. Geist for labels, Geist Mono for numbers, JetBrains Mono in terminals.

## How it behaves

- **Home and work.** Clicking a session or a workstream, or starting a session, shows the work area. The Home row, or `⌘⇧H`, returns. Selecting a different tab from Home, including by keyboard, reveals the work area.
- **Sessions.** Click: select the space, select the tab, show work. Double-click: rename (`tab.rename`). Hover to settle, restore, or close a session. Selecting a settled session from its group brings it back. Right-click: Herdr's tab menu. A working agent shows a 6px `#d8b64a` dot easing between 35% and 100% opacity every 1.3s (native `.loop`, no timers); blocked, done and idle show flat dots; the active tab sits on `#202020`.
- **Group folds.** Each recency or Settled header toggles its group, and the fold is remembered per install. The filter icon limits sessions to the active workstream. `+` opens Herdr's new-session menu.
- **Workstreams.** Click selects and shows work. Drag reorders workstreams on the same machine (`space.move`) with an accent line showing the landing spot. Right-click opens Herdr's space menu, so worktrees and rename are there. Colour chips come from the shared `space.colors` map, so other Herdr views agree. A space whose machine is not answering gets a red dot.
- **The sidebar folds to a rail.** `⌘B`, the head button or More > Toggle sidebar resize the column to 76px (44px off macOS): the window buttons own the top row, then Home, New, Agents, Search, More, workstream initials with a status dot, and `»` with the gear at the bottom. `⌘B` again, or `»`, brings the full width back. It never hides, so the window buttons always have their corner.
- **The composer.** Press Enter or click Send to start a session. The selected agent receives the text as its first task, and the first six words become the tab name. For Shell, the text only names the tab.
- **The agent pill** opens a list: agents installed on the target machine and a Shell option. The composer's `+` opens Herdr's native menu for the active workstream. The choice is remembered in shared state (`factory.agent`).
- **The machine chip** opens where the next session starts: *Follow this workstream* (the active space's machine, the default), *This computer*, each machine from `machines()`, and *Add machine…*. Choosing another machine runs `space.new` on it with the first tab already running the agent; choosing the active workstream’s machine adds a tab there. The picker marks machines that are loading or unavailable. The choice is remembered (`factory.machine`).
- **The folder chip** opens the system folder picker. The folder picker is available for local sessions. For a remote session, the chip shows the existing workstream folder or the target machine’s home.
- **The status line.** The agent count opens the agents dialog (statuses, pins, sub-agents, sort). Files and Changes swap the right panel and close it when pressed again. The palette hint shows the key actually bound to `app.palette`.
- **Keys added for this layout** (`layout:factory`): `⌘⇧H` home, `⌘⇧J` back to work, `⌘B` sidebar rail.

## Built from

`layouts/factory.json` — a root row with `"titlebar": "none"`, `"theme": "factory"`, `"traffic_lights": [16, 18]`, `"terminal_padding": [16, 20]`. Children: the `sidebar` column (`size 268`, `min 44`, `max 460`) holding four `factory-sidebar` blocks with `props: { part: "head" | "nav" | "list" | "foot" }` (the head is `window_drag`); and the `work-column` column with `work-body` (a row, `gap 0`) holding `main-stack` (`stack`, `weight 1`, `min 0`, `active: "work"`) and the hidden `panel` column (`368`, `padding 10`), then the `status` block (26px).

`main-stack` holds the `work` block — `padding: 10`, `content: { tab: "active", pane: { gap: 8, radius: 10, background: "background", lone: true, border: 1px "border", focus: 1px "accent", header: { mod: "pane", height: 30, position: "top", reveal: "hover" } } }` — and the `home` block, whose `background` is `{ image: "mods/factory-home/halftone.png", fit: "cover" }` and whose content is `factory-home`.

`panel` holds a stack (`active: "files"`) with the shipped `files` and `changes` mods.

`mods/factory-sidebar/main.js` — nav, workstreams, sessions and footer, one class. Reads `spaces()`, `agents()`, `panes()`, `machines()`, `layout()`, `window()`, `home()`, `shared`/`setShared` (space colours, rail width), `updates()`, `nextCommand()` (the `⌘B` command). Uses Herdr commands for workstream and session navigation, settling, sidebar resizing, and window controls. Opens the shipped `menu`, `picker`, `new-menu`, and `agents` mods.

`mods/factory-home/main.js` — the composer. `TextareaState` with auto-grow, `knownAgents({ on })` for the selected machine, and `pickFolder()` for local sessions. Uses `tab.new` for the active workstream and `space.new` when the target needs a new workstream. Its icons are `arrow-up.svg` and `autonomy.svg`.

`mods/factory-agents/main.js` — the agent list popup behind the pill. Receives the composer's installed-agent list and remembers the choice with `setShared("factory.agent")`.

`mods/factory-machines/main.js` — the machine list popup behind the chip. `machines()`, `setShared("factory.machine")`, and it hands *Add machine…* to the shipped `machine-add` mod.

`mods/factory-status/main.js` — the status line. Uses `layout()` for the panel state, `agents()` for status, and `keys()` for the palette hint. Tracks the active tab while Home is hidden so the composer restores focus when it reopens.

`mods/factory-more/main.js` — the More popup: Files, Changes, Close the panel, Toggle sidebar, Settings, Shortcuts, What's new, Add machine, and window controls when requested by Herdr.

`mods/factory-home/halftone.png` — the dusk, drawn by `halftone.py` in the same folder (`python3 halftone.py`): 2400×1400, a 12px dot grid, each dot's radius and colour from a field of five soft blobs plus a quiet centre, with a ±2 step of grain so it dithers instead of banding.

Shipped mods this layout uses: `pane`, `files`, `changes`, `menu`, `new-menu`, `picker`, `agents`, `machine-add`, and the icons in `mods/workspace-chrome/`.

## Watch out

- Background image paths in a layout resolve from the app's own folder (`~/.config/herdr-app`), not the home folder: `mods/factory-home/halftone.png` works, `.config/herdr-app/…` does not. This build also served SVG backgrounds poorly, so the dusk is a PNG.
- A running Herdr caches module-scope values and asset paths per source version. Keep per-build values on the class (this layout's `m(name)` helpers do), and restart the app before judging a changed asset.
- An SVG spinner (`svg(…).spin(900)`) drew nothing here, so the working mark is a pulsing dot. If the spinner works on your build, swap it in at `factory-sidebar`'s session row.
- The sidebar never hides, only folds to the rail: `titlebar: "none"` plus a hidden sidebar would leave the window buttons over the work card.
- The machine and agent choices persist in `shared.json`; *Follow this workstream* in the machine list clears the machine one.
- Not implemented: dragging sessions between positions (the list is grouped by date, so there is no honest drop index), worktree nesting under its repo, ahead/behind counts, and the machine login guidance. Worktrees appear as their own workstreams, agents live in a dialog rather than a permanent list.
- Needs Geist, Geist Mono and JetBrains Mono, all of which ship with Herdr.

## Done when

- `herdr-app check` passes for all six `mods/factory-*` folders, and `node --test tests/factory.test.cjs` passes.
- `herdr-app do layout.switch --name factory` shows the sidebar, the home screen and the halftone dusk; `errors` in `herdr-app status` is empty.
- A session whose agent works shows the yellow dot pulsing at the left of its row; the row's `×` appears on hover.
- `⌘B` folds the sidebar to the rail with the window buttons clear at the top, and `⌘B` again restores it.
- Clicking a session in the sidebar shows its terminals. Settling and reopening a session brings it back to the list.
- The composer opens a shell on a connected remote machine. From that workstream, changing the target to This computer opens a separate local shell.
