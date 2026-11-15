// The machine a new session starts on: this computer, or another one from
// `hc machine ls`. Picked from the home screen's machine chip. The choice is
// shared, so the chip and the composer agree.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { machines, theme, setShared, shared, closeOverlay, props, run } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

export default class FactoryMachines extends View {
  choose(value) {
    setShared("factory.machine", value);
    closeOverlay(props()?.overlay);
  }

  row(t, id, label, note, value, current) {
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
      .on_click(() => this.choose(value))
      .child(svg(I(value ? "server" : "monitor")).size(13).flex_none().text_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(Boolean(note), (el) => el.child(div().flex_none().font_family("Geist Mono").text_size(10).text_color(t.dim).child(note)))
      .when(current, (el) => el.child(svg(I("check")).size(12).flex_none().text_color(t.accent)));
  }

  render() {
    const t = theme();
    const chosen = shared("factory.machine");
    const list = machines();
    return v_flex()
      .size_full()
      .p(6)
      .bg(t.popover)
      .text_size(10.5)
      .font_medium()
      .text_color(t.dim)
      .child(div().px(8).pt(3).pb(6).child("START SESSIONS ON"))
      .child(this.row(t, "machines-follow", "Follow this workstream", null, null, chosen === null || chosen === undefined))
      .child(this.row(t, "machines-local", "This computer", null, "", chosen === ""))
      .children(list.filter((m) => m.name).map((m) => this.row(
        t,
        `machines-${m.name}`,
        m.name,
        m.layout === "ready" ? null : m.layout === "loading" ? "…" : "asleep",
        m.name,
        chosen === m.name,
      )))
      .child(div().h(1).my(5).mx(4).flex_none().bg(t.border))
      .child(h_flex()
        .id("machines-add")
        .h(30)
        .px(8)
        .gap(8)
        .flex_none()
        .items_center()
        .rounded(6)
        .text_size(12.5)
        .font_normal()
        .text_color(t.muted)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => {
          closeOverlay(props()?.overlay);
          run("mod.open", { name: "machine-add" });
        })
        .child(svg(I("plus")).size(13).flex_none().text_color(t.dim))
        .child(div().child("Add machine…")));
  }
}
