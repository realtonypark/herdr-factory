// The sidebar's More popup: the panels, the window, and the app's own screens.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, run, closeOverlay, props, layout, window } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class FactoryMore extends View {
  item(t, id, icon, label, action) {
    return h_flex()
      .id(id)
      .h(30)
      .px(8)
      .gap(9)
      .rounded(7)
      .flex_none()
      .items_center()
      .text_size(13)
      .text_color(t.muted)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click(() => {
        closeOverlay(props()?.overlay);
        action();
      })
      .child(icon ? svg(icon).size(14).flex_none().text_color(t.dim) : div().w(14).flex_none())
      .child(div().flex_1().child(label));
  }

  render() {
    const t = theme();
    const chrome = window();
    const panel = find(layout(), "panel");
    const show = (child) => {
      run("layout.select", { stack: "panel-body", child });
      run("layout.show", { id: "panel" });
    };
    const divider = () => div().h(1).my(5).mx(4).flex_none().bg(t.border);
    return v_flex()
      .size_full()
      .p(6)
      .bg(t.popover)
      .child(this.item(t, "more-files", "mods/files/file.svg", "Files", () => show("files")))
      .child(this.item(t, "more-changes", "mods/workspace-chrome/git-compare.svg", "Changes", () => show("changes")))
      .when(Boolean(panel && !panel.hidden), (el) => el.child(this.item(t, "more-close-panel", "mods/pane/close.svg", "Close the panel", () => run("layout.hide", { id: "panel" }))))
      .child(divider())
      .child(this.item(t, "more-sidebar", "mods/workspace-chrome/sidebar.svg", "Toggle sidebar", () => run("factory-status.toggle-sidebar")))
      .child(this.item(t, "more-settings", "mods/workspace-chrome/settings.svg", "Settings", () => run("app.settings")))
      .child(this.item(t, "more-help", null, "Shortcuts", () => run("app.help")))
      .child(this.item(t, "more-notes", null, "What's new", () => run("app.whats_new")))
      .child(divider())
      .child(this.item(t, "more-machine", "mods/workspace-chrome/plus.svg", "Add machine", () => run("mod.open", { name: "machine-add" })))
      .when(Boolean(chrome?.buttons), (el) => el.child(divider())
        .child(this.item(t, "more-minimize", "mods/tabs/win-min.svg", "Minimize", () => run("window.minimize")))
        .child(this.item(t, "more-maximize", chrome.maximized ? "mods/tabs/win-restore.svg" : "mods/tabs/win-max.svg",
          chrome.maximized ? "Restore" : "Maximize", () => run("window.maximize")))
        .child(this.item(t, "more-close-window", "mods/tabs/win-close.svg", "Close window", () => run("window.close"))));
  }
}
