// The agent a session starts with. Opened from the home screen's agent pill:
// the installed agents first (the ones this person reaches for most), then a
// plain shell, then Herdr's own new-session menu for everything else.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { knownAgents, theme, setShared, shared, closeOverlay, props, openOverlay } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

export default class FactoryAgents extends View {
  init(_props, cx) {
    this.agents = [];
    cx.spawn(async (cx) => {
      try {
        this.agents = (await knownAgents()).filter((agent) => agent.installed);
      } catch {
        this.agents = [];
      }
      cx.notify();
    });
  }

  choose(name) {
    setShared("factory.agent", name);
    closeOverlay(props()?.overlay);
  }

  row(t, id, label, icon, current) {
    return h_flex()
      .id(id)
      .h(30)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .rounded(6)
      .text_size(12.5)
      .text_color(current ? t.foreground : t.muted)
      .when(current, (el) => el.bg(t.selected))
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click(() => this.choose(label))
      .child(icon ?? div().w(14).flex_none())
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(current, (el) => el.child(svg(I("check")).size(12).flex_none().text_color(t.accent)));
  }

  render() {
    const t = theme();
    const chosen = shared("factory.agent");
    const current = chosen ?? this.agents[0]?.name ?? "Shell";
    return v_flex()
      .size_full()
      .p(6)
      .bg(t.popover)
      .child(div().px(8).pt(3).pb(6).text_size(10.5).font_medium().text_color(t.dim).child("START A SESSION WITH"))
      .children(this.agents.map((agent) => {
        const icon = agent.icon
          ? (agent.tint
            ? svg(agent.icon).size(14).flex_none().text_color(t.accent)
            : image(agent.icon).w(14).h(14).flex_none())
          : null;
        return this.row(t, `agents-${agent.name}`, agent.name, icon, current === agent.name);
      }))
      .child(this.row(t, "agents-shell", "Shell",
        svg(this.mShell()).size(14).flex_none().text_color(t.dim), current === "Shell"))
      .child(div().h(1).my(5).mx(4).flex_none().bg(t.border))
      .child(h_flex()
        .id("agents-more")
        .h(30)
        .px(8)
        .gap(8)
        .flex_none()
        .items_center()
        .rounded(6)
        .text_size(12.5)
        .text_color(t.muted)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => {
          closeOverlay(props()?.overlay);
          openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });
        })
        .child(svg(I("layers")).size(13).flex_none().text_color(t.dim))
        .child(div().child("More to start…")));
  }

  // A terminal glyph for the plain shell row.
  mShell() {
    return `mods/workspace-chrome/terminal.svg`;
  }
}
