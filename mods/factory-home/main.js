// The home screen: the mark, the question, and a composer that starts a
// session. Enter in the box starts it; the pill picks the agent, the chip
// picks the folder, and both fall back to the workstream's own.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, TextareaState, Textarea } from "gpui-base";
import { run, theme, spaces, knownAgents, pickFolder, layout, openOverlay, shared, setShared } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// A session's name from its first words, so the sidebar and the tab read well.
function shortName(text) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const line = words.slice(0, 6).join(" ");
  return line.length > 44 ? `${line.slice(0, 43)}…` : line;
}


export default class FactoryHome extends View {
  init(_props, cx) {
    this.text = "";
    this.agents = [];
    this.folder = null;
    this.shown = false;
    this.input = TextareaState.new({ placeholder: "Describe a task or ask a question", rows: 2 });
    this.input.set_auto_grow(2, 6);
    this.input.set_soft_wrap(true);
    this.input.on("change", (_e, cx) => { this.text = this.input.value(); cx.notify(); });
    this.input.on("submit", (_e, cx) => this.submit(cx));
    cx.spawn(async (cx) => {
      try {
        this.agents = [
          ...(await knownAgents()).filter((agent) => agent.installed),
          { name: "Shell", run: null, icon: null, tint: true },
        ];
      } catch {
        this.agents = [];
      }
      cx.notify();
    });
  }

  // This mod's own icons.
  m(name) {
    return `mods/factory-home/${name}.svg`;
  }

  agent() {
    const chosen = shared("factory.agent");
    const list = this.agents;
    const pick = chosen ? list.find((a) => a.name === chosen) : null;
    return pick ?? list[0] ?? null;
  }

  // "" is this computer, a name is another machine, null follows the space.
  target() {
    const chosen = shared("factory.machine");
    if (chosen === null || chosen === undefined) return spaces().find((s) => s.active)?.machine ?? "";
    return chosen;
  }

  submit(cx) {
    const text = (this.input.value() ?? "").trim();
    const space = spaces().find((s) => s.active);
    const agent = this.agent();
    const target = this.target();
    // A folder picked here only means something on this computer.
    const folder = target ? null : this.folder ?? space?.folder ?? null;
    const args = {};
    if (folder) args.folder = folder;
    if (agent?.run) {
      args.argv = agent.run;
      args.name = text ? shortName(text) : agent.name;
      if (text) args.task = text;
    } else if (text) {
      args.name = shortName(text);
    }
    if (target && target !== (space?.machine ?? "")) {
      // Another machine: the space lives there, with its first tab already running.
      args.machine = target;
      run("space.new", args);
    } else {
      if (space) args.space = space.id;
      run("tab.new", args);
    }
    run("layout.select", { stack: "main-stack", child: "work" });
    this.input.set_value("");
    this.text = "";
    this.folder = null;
    if (cx) cx.notify();
  }

  pick(t, cx) {
    pickFolder({ prompt: "Where should the session start?" }).then((folder) => {
      if (!folder) return;
      this.folder = folder;
      cx.notify();
    }).catch(() => {});
  }

  composer(t) {
    const agent = this.agent();
    const icon = agent?.icon
      ? (agent.tint ? svg(agent.icon).size(14).flex_none().text_color(t.accent) : image(agent.icon).w(14).h(14).flex_none())
      : svg(this.m("autonomy")).size(14).flex_none().text_color(t.accent);
    const pill = h_flex()
      .id("factory-agent")
      .h(28)
      .px(7)
      .gap(7)
      .flex_none()
      .items_center()
      .rounded(6)
      .font_family("Geist Mono")
      .text_size(11.5)
      .text_color(t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip("Click to pick the agent")
      .on_click(() => openOverlay({ mod: "factory-agents", kind: "popup", width: 232, height: 300 }))
      .child(icon)
      .child(div().child(agent?.name ?? "Shell"))
      .child(svg(I("chevron-down")).size(11).flex_none().text_color(t.dim));
    const target = this.target();
    const folderName = this.folder ? this.folder.replace(/\/+$/, "").split("/").pop() : (spaces().find((s) => s.active)?.name ?? "~");
    const chip = h_flex()
      .id("factory-folder")
      .h(26)
      .px(7)
      .gap(6)
      .flex_none()
      .items_center()
      .rounded(6)
      .font_family("Geist Mono")
      .text_size(11.5)
      .text_color(t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(spaces().find((s) => s.active)?.machine ? "Sessions start on that machine: the folder picker only sees this computer" : "Click to pick the folder")
      .when(!spaces().find((s) => s.active)?.machine, (el) => el.on_click((_e, cx) => this.pick(t, cx)))
      .child(svg(I("folder")).size(13).flex_none().text_color(t.dim))
      .child(div().max_w(180).truncate().child(folderName))
      .child(svg(I("chevron-down")).size(11).flex_none().text_color(t.dim));
    const send = div()
      .id("factory-send")
      .size(30)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded_full()
      .bg(t.accent)
      .cursor_pointer()
      .hover((s) => s.opacity(0.88))
      .tooltip("Start a session")
      .on_click((_e, cx) => this.submit(cx))
      .child(svg(this.m("arrow-up")).size(15).text_color(t.accent_foreground));
    return v_flex()
      .w_full()
      .max_w(680)
      .mt(30)
      .rounded(10)
      .bg("#0d0d0df2")
      .border_1()
      .border_color(t.border)
      .shadow_lg()
      .child(Textarea.new(this.input).h(74).px(16).pt(15).font_family("Geist Mono").text_size(13).text_color(t.foreground))
      .child(h_flex()
        .px(12)
        .pb(12)
        .pt(4)
        .gap(8)
        .items_center()
        .child(div()
          .id("factory-plus")
          .size(28)
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .rounded(6)
          .border_1()
          .border_color(t.border)
          .text_color(t.dim)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .tooltip("More to start")
          .on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))
          .child(svg(I("plus")).size(14)))
        .child(pill)
        .child(div().flex_1())
        .child(chip)
        .child(send));
  }

  render() {
    const t = theme();
    // Switching space or session from the keyboard must leave the home screen:
    // otherwise ctrl-2 changes the space and nothing on screen does.
    const shownSpace = spaces().find((s) => s.active);
    if (this.space && shownSpace && this.space !== shownSpace.id
      && find(layout(), "main-stack")?.active === "home") {
      run("layout.select", { stack: "main-stack", child: "work" });
    }
    this.space = shownSpace?.id ?? this.space;
    const atHome = find(layout(), "main-stack")?.active === "home";
    // Take the keyboard when the home screen comes up, and only then.
    if (atHome && !this.shown) {
      this.shown = true;
      this.input.focus();
    } else if (!atHome && this.shown) {
      this.shown = false;
    }
    const space = spaces().find((s) => s.active);
    const target = this.target();
    return v_flex()
      .size_full()
      .relative()
      .on_size_change((size, cx) => {
        this.size = size;
        cx.notify();
      })
      .child(v_flex()
        .size_full()
        .flex_1()
        .items_center()
        .justify_center()
        .px(24)
        .pb(40)
      .child(div().mt(26).text_size(34).font_normal().text_color("#f2f2f2").child("What should we work on?"))
      .child(this.composer(t))
      .child(h_flex().mt(14).gap(8).items_center()
        .child(h_flex()
          .h(24)
          .px(8)
          .gap(6)
          .items_center()
          .rounded(6)
          .bg("#0d0d0de6")
          .border_1()
          .border_color(t.border)
          .font_family("Geist Mono")
          .text_size(10.5)
          .text_color(t.foreground)
          .tooltip(target ? `Sessions start on ${target}: click to change` : "Sessions start on this computer: click to change")
          .cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => openOverlay({ mod: "factory-machines", kind: "popup", width: 232, height: 220 }))
          .child(svg(I(target ? "server" : "monitor")).size(12).flex_none().text_color(t.dim))
          .child(div().child(target || "Local"))
          .child(svg(I("chevron-down")).size(10).flex_none().text_color(t.dim)))
        .child(h_flex()
          .h(24)
          .px(8)
          .gap(6)
          .items_center()
          .rounded(6)
          .bg("#0d0d0de6")
          .border_1()
          .border_color(t.border)
          .font_family("Geist Mono")
          .text_size(10.5)
          .text_color(t.foreground)
          .tooltip(space?.folder ?? "This workstream")
          .child(svg(I("folder")).size(12).flex_none().text_color(t.dim))
          .child(div().max_w(240).truncate().child(space?.name ?? "~")))));
  }
}
