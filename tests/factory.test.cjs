const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..");
function view(name, imports = {}) {
  const file = path.join(root, "mods", "factory-" + name, "main.js");
  const source = fs.readFileSync(file, "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace("export default class", "class");
  const factoryClass = source.match(/class (\w+) extends View/)[1];
  return vm.runInNewContext(source + "\n" + factoryClass, { View: class {}, ...imports });
}

function composer({ target, active, text = "A test task", agent, folder, machineState = "ready", loading = false }) {
  const calls = [];
  const space = active === undefined ? undefined : { id: "space", active: true, machine: active, folder: "/current" };
  const FactoryHome = view("home", {
    spaces: () => space ? [space] : [],
    shared: key => key === "factory.machine" ? target : undefined,
    machines: () => [{ name: null, layout: "ready" }, { name: "remote", layout: machineState }],
    run: (name, args) => { calls.push([name, JSON.parse(JSON.stringify(args))]); },
    notify: () => {},
  });
  const home = new FactoryHome();
  home.agent = () => agent ?? { name: "Codex", run: ["codex"] };
  home.agentRequest = { target: target ?? active ?? "", agents: loading ? null : [] };

  home.input = { value: () => text, set_value: () => {} };
  home.folder = folder;
  home.submit();
  return calls;
}

test("Local selected from a remote space starts a new local space without inheriting a remote path", () => {
  assert.deepEqual(composer({ active: "remote", target: "" })[0],
    ["space.new", { machine: "", tab: "A test task", argv: ["codex"], task: "A test task" }]);
});

test("Follow this workstream launches in the active remote space", () => {
  assert.deepEqual(composer({ active: "remote", target: null })[0],
    ["tab.new", { space: "space", name: "A test task", argv: ["codex"], task: "A test task" }]);
});

test("a different remote gets a named first tab and ignores a local folder", () => {
  assert.deepEqual(composer({ active: null, target: "remote", folder: "/picked" })[0],
    ["space.new", { machine: "remote", tab: "A test task", argv: ["codex"], task: "A test task" }]);
});

test("local sessions use the selected local folder", () => {
  assert.deepEqual(composer({ active: null, target: "", folder: "/picked" })[0],
    ["tab.new", { space: "space", folder: "/picked", name: "A test task", argv: ["codex"], task: "A test task" }]);
});

test("an empty window starts a space on the selected machine", () => {
  assert.deepEqual(composer({ target: "", text: "" })[0],
    ["space.new", { machine: "", tab: "Codex", argv: ["codex"] }]);
});

test("Factory layout IDs are unique", () => {
  const ids = new Set();
  function walk(node) {
    assert(!ids.has(node.id), "Duplicate node ID: " + node.id);
    ids.add(node.id);
    for (const child of node.children ?? []) walk(child);
  }
  walk(JSON.parse(fs.readFileSync(path.join(root, "layouts", "factory.json"))));
});

test("a pending agent check or unavailable machine does not submit", () => {
  assert.deepEqual(composer({ active: null, target: "remote", machineState: "unavailable" }), []);
  assert.deepEqual(composer({ active: null, target: "remote", loading: true }), []);
});

test("a late agent check cannot replace the current machine's installed agents", async () => {
  const requests = new Map();
  let redraws = 0;
  const FactoryHome = view("home", {
    shared: () => undefined,
    knownAgents: ({ on }) => new Promise(resolve => requests.set(on, resolve)),
  });
  const home = new FactoryHome();
  const jobs = [];
  const cx = { spawn: callback => jobs.push(callback({ notify: () => redraws++ })) };
  home.loadAgents("remote", cx);
  home.loadAgents("", cx);
  requests.get(null)([{ name: "Local only", installed: true }, { name: "Unavailable", installed: false }]);
  requests.get("remote")([{ name: "Remote only", installed: true }]);
  await Promise.all(jobs);
  assert.equal(home.agent().name, "Local only");
  assert.equal(redraws, 1);
});
