// The bottom line: where this workstream lives, its branch, the agents, the
// side panels, and the key that opens the palette. Quiet enough to read as a
// footnote.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys, layout, openOverlay } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class FactoryStatus extends View {
  // The palette key as actually bound, not a hardcoded one.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const bound = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = bound && bound.keys.endsWith("--") ? [...bound.keys.slice(0, -2).split("-"), "-"] : bound?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  // A side panel: the same switch the tab bar offers, as a quiet word here.
  panel(t, id, label, icon, open, active) {
    return h_flex()
      .id(`status-${id}`)
      .h_full()
      .px(8)
      .gap(5)
      .flex_none()
      .items_center()
      .text_size(10.5)
      .text_color(open && active ? t.foreground : t.dim)
      .when(open && active, (el) => el.bg(t.selected))
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(`${label} panel`)
      .on_click(() => {
        if (open && active) {
          run("layout.hide", { id: "panel" });
          return;
        }
        run("layout.select", { stack: "panel-body", child: id });
        run("layout.show", { id: "panel" });
      })
      .child(svg(icon).size(12).flex_none().text_color(t.dim))
      .child(div().child(label));
  }

  render() {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const list = agents();
    const needs = list.filter((a) => a.status === "blocked" || a.status === "done").length;
    const working = list.filter((a) => a.status === "working").length;
    const root = layout();
    const atHome = find(root, "main-stack")?.active === "home";
    const tab = space?.tabs.find((item) => item.active)?.id;
    // This bar stays visible while Home is hidden, so it also sees native tab changes.
    if (atHome && this.atHome && tab && tab !== this.tab) {
      run("layout.select", { stack: "main-stack", child: "work" });
    } else if (atHome && !this.atHome) {
      run("factory-home.focus");
    }
    this.atHome = atHome;
    this.tab = tab;
    const panel = find(root, "panel");
    const body = find(root, "panel-body");
    const open = Boolean(panel && !panel.hidden);
    return h_flex()
      .size_full()
      .px(16)
      .gap(14)
      .items_center()
      .bg(t.canvas)
      .text_size(11.5)
      .text_color(t.dim)
      .child(h_flex().flex_1().min_w(0).gap(12).items_center().font_family("Geist Mono").text_size(10.5)
        .child(h_flex().id("status-machine").min_w(0).gap(6).items_center().tooltip(space?.machine ?? "This computer")
          .child(svg(space?.machine ? I("server") : I("monitor")).size(12).flex_none().text_color(t.dim))
          .child(div().min_w(0).truncate().child(space?.machine ?? "This computer")))
        .when(Boolean(space?.branch), (el) => el.child(h_flex().id("status-branch").min_w(0).gap(6).items_center().tooltip(space.branch)
          .child(svg(I("branch")).size(12).flex_none().text_color(t.dim))
          .child(div().min_w(0).truncate().child(space.branch)))))
      .child(h_flex().id("status-agents").flex_none().gap(6).items_center().cursor_pointer()
        .hover((s) => s.text_color(t.muted))
        .tooltip("Agents, with their state and pins")
        .on_click(() => openOverlay({ mod: "agents", kind: "dialog", width: 420, height: 560 }))
        .child(div().size(5).rounded_full().bg(needs ? t.accent : working ? t.working : t.input)
          .when(!needs && working > 0, (el) => el.loop("opacity", { from: 0.35, to: 1, period: 1300 })))
        .child(div().font_family("Geist Mono").text_size(10.5).child(`${list.length} ${list.length === 1 ? "agent" : "agents"}`))
        .when(needs > 0, (el) => el.child(div().text_color(t.accent).child(`· ${needs} need attention`))))
      .child(h_flex().flex_none().h(20).rounded(6).border_1().border_color(t.border).overflow_hidden()
        .child(this.panel(t, "files", "Files", "mods/files/file.svg", open, body?.active === "files"))
        .child(this.panel(t, "changes", "Changes", "mods/workspace-chrome/git-compare.svg", open, body?.active === "changes")))
      .child(div().id("factory-palette").flex_none().cursor_pointer().hover((s) => s.text_color(t.muted)).on_click(() => run("app.palette")).child(this.hint()));
  }
}
