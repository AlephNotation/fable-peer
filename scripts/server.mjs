#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import { FableBridge } from "./fable-bridge.mjs";

const askSchema = z.object({
  message: z.string().min(1).describe("The question or message for Fable."),
  session: z
    .string()
    .optional()
    .describe("A prior session handle returned by this tool. Omit to start fresh."),
  topic: z
    .string()
    .max(120)
    .optional()
    .describe("A short topic used to make a new session handle readable."),
  context: z
    .string()
    .optional()
    .describe("An explicit context packet. Prefer concise facts and artifacts over Codex's conclusion."),
  contextScope: z
    .enum(["none", "packet", "workspace-read"])
    .optional()
    .describe("none and packet isolate Fable from the repository; workspace-read permits read-only inspection."),
  cwd: z
    .string()
    .optional()
    .describe("Absolute workspace path. Required only for a new workspace-read session."),
  stance: z
    .enum(["independent", "critique", "collaborate", "adversarial", "review"])
    .optional()
    .describe("How Fable should approach this turn. Defaults to independent for new sessions."),
  effort: z
    .enum(["low", "medium", "high", "xhigh", "max"])
    .optional()
    .describe("Claude reasoning effort. Defaults to high for a new session."),
  timeoutSeconds: z
    .number()
    .int()
    .min(1)
    .max(900)
    .optional()
    .describe("Maximum wait for this turn. Defaults to 600 seconds."),
});

function createServer() {
  const bridge = new FableBridge();
  const server = new McpServer(
    { name: "fable-peer", version: "0.1.0" },
    {
      instructions:
        "Use ask_fable for a materially useful independent perspective, not as a mandatory second pass. Reuse its session handle only while the topic remains coherent. Fable is advisory and read-only; synthesize its answer and preserve material disagreement.",
    },
  );

  server.registerTool(
    "ask_fable",
    {
      title: "Ask Fable",
      description:
        "Ask Claude Code running Fable for an independent answer, critique, collaboration, adversarial analysis, or review. Starts a persistent session when session is omitted and continues it when a returned handle is supplied. Read-only by construction.",
      inputSchema: askSchema,
    },
    async (input) => {
      const result = await bridge.ask(input);
      return {
        content: [
          {
            type: "text",
            text: `Fable session: ${result.session}\n\n${result.answer}`,
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "list_fable_sessions",
    {
      title: "List Fable Sessions",
      description:
        "List active local Fable peer session handles and their scope, stance, turn count, and timestamps. Does not expose Claude's internal session IDs or message contents.",
      inputSchema: z.object({}),
    },
    async () => {
      const sessions = await bridge.listSessions();
      return {
        content: [
          {
            type: "text",
            text: sessions.length
              ? JSON.stringify(sessions, null, 2)
              : "No active Fable peer sessions.",
          },
        ],
        structuredContent: { sessions },
      };
    },
  );

  server.registerTool(
    "end_fable_session",
    {
      title: "End Fable Session",
      description:
        "End a Fable peer session and move its local bridge metadata to recoverable archived state. This does not delete Claude Code's transcript.",
      inputSchema: z.object({
        session: z.string().describe("The Fable session handle to end."),
      }),
    },
    async ({ session }) => {
      const result = await bridge.endSession(session);
      return {
        content: [
          {
            type: "text",
            text: `Ended Fable session ${result.session}. Bridge metadata remains recoverable locally.`,
          },
        ],
        structuredContent: result,
      };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error("fable-peer MCP server running on stdio");
