// The factory sidebar: the window's top row, its fixed actions, workstreams
// (spaces) and sessions (tabs) grouped by recency, and the person's footer.
// The layout places three copies of this mod: part "head", "nav" and "foot";
// a fourth part, "list", holds workstreams and sessions.
//
// Clicks: a workstream selects its space, a session selects its tab and shows
// the work area. The flower goes back to the home screen.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, panes, machines, run, openOverlay, theme, layout, window, home, setAgentOrder, props, shared, setShared, nextCommand, updates } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The rail goes by the sidebar's width, so dragging its edge narrows it too.
const rail = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 208;
const stack = () => find(layout(), "main-stack");

function showWork() {
  if (stack()?.active !== "work") run("layout.select", { stack: "main-stack", child: "work" });
}
// To the icon rail (wide enough for the window buttons), or back to the
// width it had. Several copies may hear the same command: the time stamp keeps
// it to one move.
function toggleRail() {
  const now = Date.now();
  if (now - (shared("factory.rail.at") ?? 0) < 400) return;
  setShared("factory.rail.at", now);
  // Hidden from the palette: bring it back, never leave the window buttons
  // sitting on the work area.
  if (find(layout(), "sidebar")?.hidden) {
    run("layout.show", { id: "sidebar" });
    return;
  }
  const width = find(layout(), "sidebar")?.size?.px ?? 268;
  const railWidth = window()?.platform === "macos" ? 76 : 44;
  if (width > railWidth) setShared("factory.rail.width", width);
  run("layout.resize", { id: "sidebar", px: width > railWidth ? railWidth : (shared("factory.rail.width") ?? 268) });
}

function showHome() {
  if (stack()?.active !== "home") run("layout.select", { stack: "main-stack", child: "home" });
}

function ago(ms) {
  if (!ms) return "";
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

// Calendar days between a moment and today: 0 is today, 1 yesterday.
function dayIndex(ms) {
  const then = new Date(ms);
  then.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - then) / 86400000);
}

const BUCKETS = [
  { id: "today", label: "Today", within: 1 },
  { id: "week", label: "Last 7 days", within: 7 },
  { id: "month", label: "Last 30 days", within: 30 },
  { id: "older", label: "Older", within: Infinity },
];

function bucketOf(ms) {
  if (!ms) return "today";
  const days = dayIndex(ms);
  return (BUCKETS.find((b) => days < b.within) ?? BUCKETS[BUCKETS.length - 1]).id;
}

// A session's name: what someone called it, else what runs in it ("OpenCode"),
// else its number.
const strip = (text) => (text ?? "").replace(/^[^\p{L}\p{N}~/]+/u, "").trim();

function sessionName(tab, pane) {
  if (tab.named) return tab.name;
  if (pane?.program?.shell) return tab.name;
  const title = strip(pane?.title);
  const program = pane?.program?.name;
  if (title && title !== program && !/^[~/]|^[A-Za-z]:\\/.test(title)) return title;
  return tab.name;
}

const lastTouch = (space) => Math.max(0, ...(space.tabs ?? []).map((tab) => tab.changed_at ?? 0)) || null;

export default class FactorySidebar extends View {
  init(_props, cx) {
    this.folded = new Set(JSON.parse(localStorage.getItem("factory.folded") ?? '["week","month","older","settled"]'));
    this.mine = localStorage.getItem("factory.mine") === "1";
    this.pressed = null;
    this.over = null;
    this.hovered = null;
    // Relative times age, so repaint slowly while the window is up.
    cx.timer.every(30000, (cx) => cx.notify());
    // cmd-b reaches the head copy and collapses the sidebar to its rail.
    if (props()?.part === "head") {
      cx.spawn(async (cx) => {
        for (;;) {
          try {
            const command = await nextCommand();
            if (command === "toggle") toggleRail();
          } catch {
            return;
          }
          cx.notify();
        }
      });
    }
  }

  // This mod's own icons.
  m(name) {
    return `mods/factory-sidebar/${name}.svg`;
  }
  fold(id, cx) {
    if (this.folded.has(id)) this.folded.delete(id);
    else this.folded.add(id);
    localStorage.setItem("factory.folded", JSON.stringify([...this.folded]));
    if (cx) cx.notify();
  }

  // A nav row: an icon and a label, with something on the right.
  nav(t, id, icon, label, action, right, on) {
    return h_flex()
      .id(id)
      .h(30)
      .flex_none()
      .px(8)
      .gap(10)
      .rounded(7)
      .items_center()
      .text_size(13)
      .text_color(on ? t.foreground : t.muted)
      .when(on, (el) => el.bg(t.selected))
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click(action)
      .child(svg(icon).size(15).flex_none().text_color(on ? t.foreground : t.dim))
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(Boolean(right), (el) => el.child(right));
  }

  section(t, label, id, action, right) {
    const open = !this.folded.has(id);
    return h_flex()
      .id(`sec-${id}`)
      .h(30)
      .flex_none()
      .px(8)
      .pt(8)
      .gap(6)
      .items_center()
      .text_size(10.5)
      .font_medium()
      .text_color(t.dim)
      .when(Boolean(action), (el) => el.cursor_pointer()
        .hover((s) => s.text_color(t.foreground))
        .on_click((_e, cx) => { cx.stop_propagation(); action(cx); }))
      .child(div().flex_1().truncate().child(label.toUpperCase()))
      .when(Boolean(right), (el) => el.child(right))
      .when(Boolean(action), (el) => el.child(svg(I(open ? "chevron-down" : "chevron-right")).size(11).flex_none()));
  }

  // A count that speaks up: an orange pill the person can't miss.
  badge(t, count, hot) {
    if (!count) return null;
    return h_flex()
      .flex_none()
      .gap(5)
      .items_center()
      .child(div().size(6).rounded_full().bg(hot ? t.accent : t.dim))
      .child(div().text_size(11.5).text_color(hot ? t.accent : t.dim).child(String(count)));
  }

  head(t, compact) {
    const w = window();
    const lights = w?.platform === "macos" && !w?.fullscreen;
    // On the rail the window buttons own the top row: leave it to them.
    if (compact) return v_flex().size_full().bg(t.chrome);
    const icon = (id, name, action, tip) => div()
      .id(id)
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(tip)
      .on_click(action)
      .child(svg(name).size(15));
    const atHome = stack()?.active === "home";
    return h_flex()
      .size_full()
      .items_center()
      .gap(4)
      .pl(lights && !compact ? 76 : compact ? 0 : 12)
      .pr(10)
      .when(lights && compact, (el) => el.pt(24).justify_center())
      .child(div()
        .id("factory-sidebar-toggle")
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(7)
        .cursor_pointer()
        .text_color(t.muted)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip(rail() ? "Show the sidebar" : "Collapse the sidebar")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(toggleRail)
        .child(svg(I("sidebar")).size(16)))
      .when(!compact, (el) => el.child(div().flex_1()))
      .when(!compact, (el) => el
        .child(icon("factory-prev", I("chevron-left"), () => run("space.prev"), "Previous space"))
        .child(icon("factory-next", I("chevron-right"), () => run("space.next"), "Next space")));
  }

  navPart(t, compact) {
    const atHome = stack()?.active === "home";
    const needing = agents().filter((a) => a.status === "blocked" || a.status === "done");
    const working = agents().filter((a) => a.status === "working").length;
    const search = () => run("mod.open", { name: "picker" });
    const more = () => run("mod.open", { name: "factory-more" });
    const session = () => { run("tab.new"); showWork(); };
    if (compact) {
      const cell = (id, name, action, tip, tone) => div()
        .id(id)
        .w(32)
        .h(28)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(7)
        .text_color(tone ?? t.muted)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip(tip)
        .on_click(action)
        .child(svg(name).size(15));
      return v_flex().size_full().items_center().pt(2).gap(2)
        .child(cell("factory-home", this.m("house"), showHome, "Home", atHome ? t.foreground : undefined))
        .child(cell("factory-new", I("plus"), session, "New session"))
        .child(cell("factory-agents", I("circle-check"), () => openOverlay({ mod: "agents", kind: "dialog", width: 420, height: 560 }), needing.length ? `${needing.length} needs you` : "Agents", needing.length ? t.accent : working ? t.working : undefined))
        .child(cell("factory-search", I("search"), search, "Search"))
        .child(cell("factory-more", I("layers"), more, "More"));
    }
    return v_flex().size_full().pt(2).gap(1)
      .child(this.nav(t, "factory-home", this.m("house"), "Home", showHome, null, atHome))
      .child(this.nav(t, "factory-new", I("plus"), "New session", session))
      .child(this.nav(t, "factory-agents", I("circle-check"), working ? `Agents · ${working} working` : "Agents",
        () => openOverlay({ mod: "agents", kind: "dialog", width: 420, height: 560 }),
        this.badge(t, needing.length, true)))
      .child(this.nav(t, "factory-search", I("search"), "Search", search))
      .child(this.nav(t, "factory-more", I("layers"), "More", more));
  }


  // A workstream's colour, shared with Herdr's own lists so every view agrees.
  colors() {
    const palette = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
    const kept = { ...(shared("space.colors") ?? {}) };
    const list = spaces();
    const ids = new Set(list.map((p) => p.id));
    let changed = false;
    for (const id of Object.keys(kept)) if (!ids.has(id)) { delete kept[id]; changed = true; }
    for (const space of list) {
      if (kept[space.id]) continue;
      const uses = (c) => Object.values(kept).filter((v) => v === c).length;
      kept[space.id] = palette.reduce((best, c) => (uses(c) < uses(best) ? c : best));
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    return kept;
  }

  mark(t, space, colors) {
    const name = colors[space.id];
    return h_flex()
      .size(18)
      .flex_none()
      .rounded(5)
      .items_center()
      .justify_center()
      .text_size(10.5)
      .font_bold()
      .text_color("#ffffff")
      .bg(t[name] ?? t.dim)
      .child([...space.name][0]?.toUpperCase() ?? "?");
  }

  workstreams(t, compact) {
    const list = spaces();
    const colors = this.colors();
    if (compact) {
      return v_flex().size_full().items_center().gap(3).pt(6)
        .children(list.map((s) => div()
          .id(`ws-${s.id}`)
          .relative()
          .size(26)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(7)
          .text_size(11.5)
          .font_semibold()
          .text_color(s.active ? t.foreground : t.muted)
          .when(s.active, (el) => el.bg(t.selected))
          .hover((s2) => s2.bg(t.hover))
          .tooltip(s.name)
          .on_click(() => { run("space.select", { id: s.id }); showWork(); })
          .child([...s.name][0]?.toUpperCase() ?? "?")
          .when(Boolean(s.status), (s2) => s2.child(div().absolute().right(4).bottom(4).size(5).rounded_full().bg(t[s.status] ?? t.dim)))));
    }
    return v_flex()
      .child(this.section(t, "Workstreams", "workstreams", null,
        div().id("ws-new").size(20).flex_none().flex().items_center().justify_center().rounded(5)
          .text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip("New workstream")
          .on_click((_e, cx) => { cx.stop_propagation(); run("space.new"); })
          .child(svg(I("plus")).size(13))))
      .children(list.map((space, i) => {
        const time = lastTouch(space);
        const branch = space.branch && space.branch !== "main" && space.branch !== "master" ? space.branch : null;
        return h_flex()
          .id(`ws-${space.id}`)
          .relative()
          .h(30)
          .flex_none()
          .px(8)
          .gap(9)
          .rounded(6)
          .items_center()
          .text_size(13)
          .text_color(space.active ? t.foreground : t.muted)
          .when(space.active, (el) => el.bg(t.selected))
          .when(!space.active, (el) => el.hover((s) => s.bg(t.hover).text_color(t.foreground)))
          .cursor_pointer()
          .when(this.pressed === space.id && this.over !== space.id, (el) => el.opacity(0.5))
          .when(this.pressed !== null && this.over === space.id && this.pressed !== space.id, (el) => el.child(
            div().absolute().left(0).right(0).h(2).bg(t.accent)
              .when(spaces().findIndex((s) => s.id === this.pressed) < i, (line) => line.bottom(0))
              .when(spaces().findIndex((s) => s.id === this.pressed) > i, (line) => line.top(0))))
          .on_mouse_down("left", () => { this.pressed = space.id; this.over = space.id; })
          .on_mouse_move(() => { if (this.pressed !== null && this.over !== space.id) { this.over = space.id; } })
          .on_mouse_up("left", (_e, cx) => {
            const from = this.pressed;
            const to = this.over;
            this.pressed = null;
            this.over = null;
            if (from && to && from !== to) {
              const index = spaces().findIndex((s) => s.id === space.id);
              if (index !== -1) run("space.move", { id: from, index: index + 1 });
            } else if (from === space.id) {
              run("space.select", { id: space.id });
              showWork();
            }
            cx.notify();
          })
          .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 220, height: 300, props: { tab: "space", target: { id: space.id } } }))
          .child(this.mark(t, space, colors))
          .child(div().flex_1().min_w(0).truncate().child(space.name))
          .when(Boolean(space.machine), (el) => el.child(h_flex().flex_none().gap(4).items_center()
            .child(div().font_family("Geist Mono").text_size(10).text_color(t.dim).child(space.machine))
            .when(machines().some((m) => m.name === space.machine && m.layout === "unavailable"),
              (off) => off.tooltip(`${space.machine} is not answering`).child(div().size(5).rounded_full().bg(t.blocked)))))
          .when(Boolean(branch), (el) => el.child(h_flex().flex_none().gap(3).items_center()
            .child(svg(I("branch")).size(10).flex_none().text_color(t.dim))
            .child(div().font_family("Geist Mono").text_size(10).text_color(t.dim).max_w(88).truncate().child(branch))))
          .when(Boolean(space.status), (el) => el.child(space.status === "working"
            ? div().size(5).rounded_full().flex_none().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 1300 })
            : div().size(5).rounded_full().flex_none().bg(t[space.status] ?? t.dim)))
          .when(Boolean(time), (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10.5).text_color(t.dim).child(ago(time))));
      }));
  }

  sessions(t, compact) {
    if (compact) return div();
    const active = spaces().find((s) => s.active);
    const lead = new Map();
    for (const pane of panes()) if (pane.terminal && !lead.has(pane.tab)) lead.set(pane.tab, pane);
    const all = spaces().flatMap((space) => (space.tabs ?? []).map((tab) => ({ space, tab })));
    const list = (this.mine && active ? all.filter((x) => x.space.id === active.id) : all)
      .filter((x) => !x.tab.settled || x.tab.status === "blocked" || x.tab.status === "done")
      .sort((a, b) => (b.tab.changed_at ?? 0) - (a.tab.changed_at ?? 0));
    const newSession = div()
      .id("sessions-new")
      .size(20)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip("New session: a terminal or an agent")
      .on_click((_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }); })
      .child(svg(I("plus")).size(13));
    const filter = div()
      .id("sessions-filter")
      .size(20)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(5)
      .text_color(this.mine ? t.accent : t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(this.mine ? `Showing ${active?.name ?? "this workstream"}: click for all` : "Showing every workstream: click for this one")
      .on_click((_e, cx) => {
        cx.stop_propagation();
        this.mine = !this.mine;
        localStorage.setItem("factory.mine", this.mine ? "1" : "0");
        cx.notify();
      })
      .child(svg(this.m("filter")).size(13));
    const rows = [];

    const line = ({ space, tab }, settled) => {
      const on = tab.active && space.active;
      const name = sessionName(tab, lead.get(tab.id));
      const hovered = this.hovered === tab.id;
      return h_flex()
        .id(`session-${tab.id}`)
        .h(28)
        .flex_none()
        .px(8)
        .gap(8)
        .rounded(7)
        .items_center()
        .text_size(13)
        .text_color(on ? t.foreground : settled ? t.dim : t.muted)
        .when(on, (el) => el.bg(t.selected))
        .when(!on, (el) => el.hover((s) => s.bg(t.hover).text_color(t.foreground)))
        .cursor_pointer()
        .on_hover((over, cx) => {
          const next = over ? tab.id : null;
          if (this.hovered !== next) { this.hovered = next; cx.notify(); }
        })
        .on_click(() => { run("space.select", { id: space.id }); run("tab.select", { id: tab.id }); showWork(); })
        .on_mouse_down("left", (e) => { if (e.click_count === 2) run("tab.rename", { id: tab.id }); })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 220, height: 320, props: { tab: "tab", target: { id: tab.id, space: space.id } } }))
        .child(div()
          .w(12)
          .flex_none()
          .flex()
          .items_center()
          .child(tab.status === "working"
            ? div().size(6).rounded_full().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 1300 })
            : div().size(5).rounded_full().bg(tab.status ? t[tab.status] ?? t.dim : on ? t.muted : t.input)))
        .child(div().flex_1().min_w(0).truncate().child(name))
        .when(tab.zoomed, (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10).text_color(t.dim).child("Z")))
        .when(hovered, (el) => el.child(div()
          .id(`session-close-${tab.id}`)
          .size(16)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(4)
          .text_color(t.dim)
          .hover((s) => s.bg(t.raised).text_color(t.foreground))
          .tooltip("Close this session")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: tab.id }); })
          .child(svg("mods/pane/close.svg").size(10))))
        .when(!hovered, (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10.5).text_color(t.dim).child(ago(tab.changed_at))));
    };

    const groups = BUCKETS.map((b) => ({ ...b, rows: list.filter((x) => !x.tab.settled && bucketOf(x.tab.changed_at) === b.id) }))
      .filter((g) => g.rows.length);
    for (const [i, group] of groups.entries()) {
      rows.push(this.section(t, group.label, group.id, (cx) => this.fold(group.id, cx),
        i === 0 ? h_flex().flex_none().gap(2).items_center().child(filter).child(newSession) : null));
      if (!this.folded.has(group.id)) for (const x of group.rows) rows.push(line(x, false));
    }
    const away = list.filter((x) => x.tab.settled);
    if (away.length) {
      rows.push(this.section(t, `Settled · ${away.length}`, "settled", (cx) => this.fold("settled", cx), null));
      if (!this.folded.has("settled")) for (const x of away) rows.push(line(x, true));
    }
    return v_flex().children(rows);
  }

  foot(t, compact) {
    const name = home().split("/").filter(Boolean).pop() ?? "you";
    const needing = agents().filter((a) => a.status === "blocked" || a.status === "done").length;
    const gear = div()
      .id("factory-settings")
      .size(26)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(6)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip("Settings")
      .on_click(() => run("app.settings"))
      .child(svg(I("settings")).size(15))
      .when(Boolean(updates()?.app?.ready), (el) => el.relative().child(div().absolute().top(3).right(3).size(5).rounded_full().bg(t.accent)));
    if (compact) {
      const unfold = div()
        .id("factory-unfold")
        .size(26)
        .flex_none()
        .flex()
        .items_center()
        .justify_center()
        .rounded(6)
        .text_size(14)
        .text_color(t.dim)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip("Show the sidebar")
        .on_click(toggleRail)
        .child("»");
      return v_flex().size_full().items_center().justify_center().gap(2).pb(4)
        .child(unfold)
        .child(gear);
    }
    return h_flex().size_full().items_center().gap(9).px(10)
      .child(div().size(22).flex_none().rounded_full().bg(t.ansi6).flex().items_center().justify_center()
        .text_size(11).font_semibold().text_color("#08120f").child([...name][0]?.toUpperCase() ?? "?"))
      .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(t.muted).child(name))
      .when(needing > 0, (el) => el.child(div().size(6).flex_none().rounded_full().bg(t.accent)))
      .child(gear);
  }

  render() {
    const t = theme();
    const compact = rail();
    const part = props()?.part ?? "list";
    if (part === "head") return v_flex().size_full().bg(t.chrome).child(this.head(t, compact));
    if (part === "nav") return v_flex().size_full().bg(t.chrome).px(compact ? 0 : 8).child(this.navPart(t, compact));
    if (part === "foot") return v_flex().size_full().bg(t.chrome).child(this.foot(t, compact));
    const chain = agents().slice().sort((a, b) => b.seq - a.seq).map((a) => a.address);
    if (chain.length) setAgentOrder(chain);
    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .px(compact ? 0 : 8)
      .pb(8)
      .child(v_flex()
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .children([
          this.workstreams(t, compact),
          this.sessions(t, compact),
        ]));
  }
}
