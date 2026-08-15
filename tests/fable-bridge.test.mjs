import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { FableBridge } from "../scripts/fable-bridge.mjs";

async function makeFixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fable-peer-test-"));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const fakeClaude = path.join(directory, "fake-claude.mjs");
  await writeFile(
    fakeClaude,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const resumeIndex = args.indexOf("--resume");
const prompt = args.at(-1);
const sessionId = resumeIndex >= 0 ? args[resumeIndex + 1] : "fake-session-id";
process.stdout.write(JSON.stringify({
  session_id: sessionId,
  result: (resumeIndex >= 0 ? "continued" : "started") + ":" + prompt,
  model: "claude-fable-5",
  duration_ms: 7,
  usage: { input_tokens: 3, output_tokens: 5 }
}));
`,
    { mode: 0o700 },
  );
  await chmod(fakeClaude, 0o700);
  const workspace = path.join(directory, "workspace");
  await mkdir(workspace);

  return {
    directory,
    workspace,
    bridge: new FableBridge({
      stateDir: path.join(directory, "state"),
      claudeBin: fakeClaude,
      depth: 0,
    }),
  };
}

test("starts and continues an isolated packet session", async (t) => {
  const fixture = await makeFixture(t);
  const started = await fixture.bridge.ask({
    message: "What would you change?",
    context: "A small context packet",
    topic: "api design",
    contextScope: "packet",
    stance: "independent",
  });

  assert.match(started.session, /^api-design-[a-f0-9]{6}$/);
  assert.match(started.answer, /^started:/);
  assert.equal(started.contextScope, "packet");
  assert.equal(started.turns, 1);

  const continued = await fixture.bridge.ask({
    message: "Now challenge that answer.",
    session: started.session,
    stance: "adversarial",
  });
  assert.match(continued.answer, /^continued:/);
  assert.equal(continued.session, started.session);
  assert.equal(continued.turns, 2);

  const sessions = await fixture.bridge.listSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].session, started.session);
  assert.equal(sessions[0].turns, 2);
});

test("binds workspace sessions to a real read-only context root", async (t) => {
  const fixture = await makeFixture(t);
  const started = await fixture.bridge.ask({
    message: "Inspect the architecture.",
    contextScope: "workspace-read",
    cwd: fixture.workspace,
  });

  const metadata = JSON.parse(
    await readFile(
      path.join(fixture.directory, "state", "sessions", `${started.session}.json`),
      "utf8",
    ),
  );
  assert.equal(metadata.cwd, await realpath(fixture.workspace));

  await assert.rejects(
    fixture.bridge.ask({
      message: "Switch scope.",
      session: started.session,
      contextScope: "packet",
    }),
    /start a new session to change scope/,
  );
});

test("ends sessions by archiving metadata", async (t) => {
  const fixture = await makeFixture(t);
  const started = await fixture.bridge.ask({ message: "Hello" });
  const ended = await fixture.bridge.endSession(started.session);

  assert.equal(ended.ended, true);
  assert.match(ended.recoverableMetadataPath, /ended-sessions/);
  assert.deepEqual(await fixture.bridge.listSessions(), []);
  await assert.rejects(
    fixture.bridge.ask({ message: "Again", session: started.session }),
    /unknown or ended Fable session/,
  );
});

test("blocks recursive peer calls", async () => {
  const bridge = new FableBridge({ depth: 1 });
  await assert.rejects(
    bridge.ask({ message: "recurse" }),
    /disabled inside a peer-spawned agent/,
  );
});
