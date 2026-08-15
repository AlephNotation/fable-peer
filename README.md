# Fable Peer

Fable Peer is a local Codex plugin that gives Codex a persistent Claude Code
session running the Fable model. It is a general-purpose second-model channel:
Codex can ask for an independent answer, critique a proposal, collaborate on an
idea, search for counterexamples, or review code without routing the exchange
through GitHub.

The bridge is deliberately asymmetric and bounded. Codex remains the primary
agent; Fable runs as a read-only advisory peer. Session handles allow useful
follow-up questions, while a recursion guard prevents Codex and Fable from
calling each other indefinitely.

## What it provides

- `ask_fable` starts or continues a Fable conversation.
- `list_fable_sessions` recovers active session handles.
- `end_fable_session` archives local session metadata.
- `none`, `packet`, and `workspace-read` context scopes control what Fable sees.
- Independent, critique, collaborative, adversarial, and review stances.
- Atomic session state, per-session locking, timeouts, and recursion protection.

Fable Peer stores only session metadata under `~/.local/share/fable-peer`.
Claude Code owns the conversation transcripts. Ending a session archives its
metadata rather than deleting the Claude transcript.

## Requirements

- Node.js 20 or newer
- Codex with plugin and MCP support
- Claude Code authenticated with access to the `fable` model

## Development

```sh
npm ci
npm test
```

`npm test` rebuilds the self-contained MCP server in `dist/server.mjs` before
running the bridge tests. The committed bundle lets the installed plugin run
without a production `node_modules` directory.

## Using it from Codex

After installing the plugin, ask naturally:

> Ask Fable independently whether this architecture has a hidden flaw.

> Have Fable critique this implementation with read-only workspace access.

> Continue the same Fable session and challenge its previous answer.

The included `consult-fable` skill chooses a context scope and stance, manages
session continuity, and asks Codex to synthesize the result rather than treating
a second model's answer as verification.

## Reciprocal Claude-to-Codex channel

Claude Code can reach Codex through Codex's standard MCP server:

```sh
claude mcp add --transport stdio --scope user codex-peer \
  -e FABLE_PEER_DEPTH=1 -- codex mcp-server
```

The depth marker is part of the loop guard. A Claude session can then ask the
`codex-peer` server for a Codex perspective without enabling autonomous
model-to-model ping-pong.

## Safety model

Fable is launched in plan mode with an empty MCP configuration and a system
instruction that prohibits edits, subagents, and recursive peer calls.
`workspace-read` sessions are bound to the real path supplied when the session
starts; that scope cannot be silently changed on a later turn.

## License

MIT
