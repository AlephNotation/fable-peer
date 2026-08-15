---
name: consult-fable
description: Consult a persistent Claude Code session running Fable for an independent answer, critique, collaboration, adversarial analysis, debugging hypothesis, architectural alternative, or code review. Use when the user explicitly asks Codex to ask or consult Fable/Claude, when materially different model priors would help with an uncertain or consequential judgment, or when continuing an existing Fable peer discussion. Do not use for facts that should be verified directly from primary sources, routine deterministic work, or as a mandatory second pass on every task.
---

# Consult Fable

Use the `ask_fable` MCP tool. Treat Fable as an advisory peer, not a delegated authority.

## Choose the context scope

- Use `none` for a general question that needs no repository context.
- Use `packet` by default. Supply only the goal, known facts, constraints, and selected artifacts needed to answer.
- Use `workspace-read` only when Fable must inspect the repository. Pass the absolute workspace root as `cwd`.

For an independent second opinion, omit Codex's preferred conclusion from the first context packet. Include Codex's reasoning only when asking for critique or in a later rebuttal.

## Choose the stance

- `independent`: derive a separate answer without anchoring on Codex.
- `critique`: examine an explicit proposal or conclusion.
- `collaborate`: develop an incomplete idea together.
- `adversarial`: search for counterexamples and failure modes.
- `review`: inspect an artifact and prioritize concrete findings.

Use `high` effort normally and `max` only for consequential architecture, subtle debugging, or a requested deep review.

## Manage the conversation

1. Start without `session`; give the session a short `topic`.
2. Preserve the returned handle while the topic remains coherent.
3. Continue with that handle for rebuttals or refinement.
4. Start fresh when the topic changes materially or an independent prior is important.
5. Use `list_fable_sessions` after compaction when a handle is lost.
6. Use `end_fable_session` when the discussion is finished; metadata remains recoverable locally.

Do not create autonomous ping-pong. Usually ask once and allow at most one evidence-bearing rebuttal. If disagreement persists, convert it into a test, counterexample, or explicit decision for the user.

## Synthesize the answer

Evaluate Fable's response against source evidence and tests. Attribute material influence or unresolved disagreement in the user-facing result. Do not present Fable's claim as verification merely because it came from a second model.
