// The home screen: the mark, the question, and a composer that starts a
// session. Enter in the box starts it; the pill picks the agent, the chip
// picks the folder, and both fall back to the workstream's own.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, TextareaState, Textarea } from "gpui-base";
import { checking, run, theme, spaces, machines, focused, knownAgents, pickFolder, nextCommand, openOverlay, shared } from "herdr";

const I = (name) => `mods/workspace-chrome/${name}.svg`;

// A session's name from its first words, so the sidebar and the tab read well.
function shortName(text) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const line = words.slice(0, 6).join(" ");
  return line.length > 44 ? `${line.slice(0, 43)}…` : line;
}


export default class FactoryHome extends View {
  init(_props, cx) {
    this.folder = null;
    this.input = TextareaState.new({ placeholder: "Describe a task or ask a question", rows: 2 });
    this.input.set_auto_grow(2, 6);
    this.input.set_soft_wrap(true);
    this.input.on("submit", (_e, cx) => this.submit(cx));
    if (checking()) return;
    this.input.focus();
    cx.spawn(async () => {
      for (;;) {
        if (await nextCommand() === "focus") this.input.focus();
      }
    });
  }

  loadAgents(target, cx) {
    const request = { target, agents: null, failed: false };
    this.agentRequest = request;
    cx.spawn(async (cx) => {
      try {
        request.agents = (await knownAgents({ on: target || null })).filter((agent) => agent.installed);
      } catch {
        request.agents = [];
        request.failed = true;
      }
      if (this.agentRequest === request) cx.notify();
    });
  }

  // This mod's own icons.
  m(name) {
    return `mods/factory-home/${name}.svg`;
  }

  agent() {
    const chosen = shared("factory.agent");
    const list = this.agentRequest?.agents ?? [];
    if (chosen === "Shell") return null;
    return list.find((a) => a.name === chosen) ?? list[0] ?? null;
  }

  // "" is this computer, a name is another machine, null follows the space.
  target(space) {
    return shared("factory.machine") ?? space?.machine ?? "";
  }

  machineState(target) {
    return target ? (machines().find((machine) => machine.name === target)?.layout ?? "unavailable") : "ready";
  }

  submit(cx) {
    const space = spaces().find((s) => s.active);
    const target = this.target(space);
    if (this.machineState(target) !== "ready" || this.agentRequest?.target !== target || !this.agentRequest.agents
      || (this.agentRequest.failed && shared("factory.agent") !== "Shell")) return;
    const text = (this.input.value() ?? "").trim();
    const agent = this.agent();
    const sameSpace = space && target === (space.machine ?? "");
    const name = text ? shortName(text) : agent?.name;
    const args = {};
    if (!target && this.folder) args.folder = this.folder;
    if (agent?.run) {
      args.argv = agent.run;
      if (text) args.task = text;
    }
    if (sameSpace) {
      run("tab.new", { ...args, space: space.id, ...(name && { name }) });
    } else {
      run("space.new", { ...args, machine: target, ...(name && { tab: name }) });
    }
    run("layout.select", { stack: "main-stack", child: "work" });
    this.input.set_value("");
    this.folder = null;
    if (cx) cx.notify();
  }

  pick(cx) {
    cx.spawn(async (cx) => {
      let folder;
      try {
        folder = await pickFolder({ prompt: "Choose session folder" });
      } catch {
        return;
      }
      if (!folder) return;
      this.folder = folder;
      cx.notify();
    });
  }

  composer(t, space, target, machineState) {
    const agent = this.agent();
    const request = this.agentRequest;
    const ready = machineState === "ready";
    const loading = ready && !request?.agents;
    const canChoose = ready && !loading;
    const canStart = canChoose && (!request.failed || shared("factory.agent") === "Shell");
    const icon = agent?.icon
      ? (agent.tint ? svg(agent.icon).size(14).flex_none().text_color(t.accent) : image(agent.icon).w(14).h(14).flex_none())
      : svg(agent || loading ? this.m("autonomy") : I("terminal")).size(14).flex_none().text_color(t.accent);
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
      .when(canChoose, (el) => el.cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .tooltip("Choose what to start")
        .on_click(() => openOverlay({ mod: "factory-agents", kind: "popup", width: 232, height: 300,
          props: { agents: request.agents, selected: canStart ? (agent?.name ?? "Shell") : null, failed: request.failed } })))
      .child(icon)
      .child(div().max_w(125).truncate().child(!ready ? (machineState === "loading" ? "Loading machine…" : "Machine unavailable") : loading ? "Checking agents…"
        : !canStart ? "Agent check failed" : agent?.name ?? "Shell"))
      .when(canChoose, (el) => el.child(svg(I("chevron-down")).size(11).flex_none().text_color(t.dim)));
    const folder = (!target && this.folder) || ((space?.machine ?? "") === target && (focused()?.cwd || space?.folder));
    const folderName = folder ? folder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || folder : "~";
    const chip = h_flex()
      .id("factory-folder")
      .h(26)
      .px(7)
      .gap(6)
      .min_w(0)
      .items_center()
      .rounded(6)
      .font_family("Geist Mono")
      .text_size(11.5)
      .text_color(t.muted)
      .tooltip(target ? (folder || "Machine home folder") : (folder || "Choose a local folder"))
      .when(!target, (el) => el.cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => this.pick(cx)))
      .child(svg(I("folder")).size(13).flex_none().text_color(t.dim))
      .child(div().min_w(0).max_w(180).truncate().child(folderName))
      .when(!target, (el) => el.child(svg(I("chevron-down")).size(11).flex_none().text_color(t.dim)));
    const send = div()
      .id("factory-send")
      .size(30)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded_full()
      .bg(canStart ? t.solid : t.raised)
      .when(canStart, (el) => el.cursor_pointer()
        .hover((s) => s.opacity(0.88))
        .tooltip(agent ? "Start agent session" : "Start shell session")
        .on_click((_e, cx) => this.submit(cx)))
      .child(svg(this.m("arrow-up")).size(15).text_color(canStart ? t.solid_foreground : t.dim));
    return v_flex()
      .w_full()
      .max_w(680)
      .mt(30)
      .rounded(10)
      .bg(t.background)
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
          .tooltip("More actions in the current workstream")
          .on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))
          .child(svg(I("plus")).size(14)))
        .child(pill)
        .child(div().flex_1())
        .child(chip)
        .child(send));
  }

  render(cx) {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const target = this.target(space);
    const machineState = this.machineState(target);
    if (machineState === "ready" && this.agentRequest?.target !== target && !checking()) this.loadAgents(target, cx);
    if (machineState !== "ready") this.agentRequest = null;
    return v_flex()
      .size_full()
      .child(v_flex()
        .size_full()
        .flex_1()
        .items_center()
        .justify_center()
        .px(24)
        .pb(40)
      .child(div().mt(26).text_size(34).font_normal().text_color("#f2f2f2").child("What should we work on?"))
      .child(this.composer(t, space, target, machineState))
      .child(h_flex().mt(14).gap(8).items_center()
        .child(h_flex()
          .id("factory-machine")
          .h(24)
          .px(8)
          .gap(6)
          .items_center()
          .rounded(6)
          .bg(t.background)
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
          .child(div().max_w(160).truncate().child(target || "Local"))
          .child(svg(I("chevron-down")).size(10).flex_none().text_color(t.dim)))
        .when(Boolean(space && (space.machine ?? "") === target), (el) => el.child(h_flex()
          .h(24)
          .px(8)
          .gap(6)
          .items_center()
          .rounded(6)
          .bg(t.background)
          .border_1()
          .border_color(t.border)
          .font_family("Geist Mono")
          .text_size(10.5)
          .text_color(t.foreground)
          .tooltip(space?.folder ?? "This workstream")
          .child(svg(I("folder")).size(12).flex_none().text_color(t.dim))
          .child(div().max_w(180).truncate().child(space.name))))));
  }
}
