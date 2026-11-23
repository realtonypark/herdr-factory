// The agent a session starts with. Opened from the home screen's agent pill:
// agents installed on the composer's target machine, plus a plain shell.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, setShared, closeOverlay, props } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

export default class FactoryAgents extends View {
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
    const { agents = [], selected = "Shell", failed = false } = props() ?? {};
    return v_flex()
      .size_full()
      .p(6)
      .bg(t.popover)
      .child(div().px(8).pt(3).pb(6).text_size(10.5).font_medium().text_color(t.dim).child("START A SESSION WITH"))
      .when(failed, (el) => el.child(div().px(8).pb(6).text_size(12).text_color(t.muted)
        .child("Could not check installed agents on this machine.")))
      .child(v_flex().id("factory-agent-list").h(Math.min(180, agents.length * 30)).overflow_y_scrollbar().children(agents.map((agent) => {
        const icon = agent.icon
          ? (agent.tint
            ? svg(agent.icon).size(14).flex_none().text_color(t.accent)
            : image(agent.icon).w(14).h(14).flex_none())
          : null;
        return this.row(t, `agents-${agent.key}`, agent.name, icon, selected === agent.name);
      })))
      .child(this.row(t, "agents-shell", "Shell",
        svg(I("terminal")).size(14).flex_none().text_color(t.dim), selected === "Shell"));
  }
}
