import { describe, expect, it, vi } from "vitest";
import type { TuiStateAccess } from "./tui-types.js";
import { createSessionActions } from "./tui-session-actions.js";

describe("tui session actions", () => {
  it("queues session refreshes and applies the latest result", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;

    const listSessions = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const state: TuiStateAccess = {
      agentDefaultId: "main",
      sessionMainKey: "agent:main:main",
      sessionScope: "global",
      agents: [],
      currentAgentId: "main",
      currentSessionKey: "agent:main:main",
      currentSessionId: null,
      activeChatRunId: null,
      historyLoaded: false,
      historyMessageCount: 0,
      sessionInfo: {},
      initialSessionApplied: true,
      isConnected: true,
      autoMessageSent: false,
      toolsExpanded: false,
      showThinking: false,
      connectionStatus: "connected",
      activityStatus: "idle",
      statusTimeout: null,
      lastCtrlCAt: 0,
    };

    const updateFooter = vi.fn();
    const updateAutocompleteProvider = vi.fn();
    const requestRender = vi.fn();

    const { refreshSessionInfo } = createSessionActions({
      client: { listSessions } as { listSessions: typeof listSessions },
      chatLog: { addSystem: vi.fn() } as unknown as import("./components/chat-log.js").ChatLog,
      tui: { requestRender } as unknown as import("@mariozechner/pi-tui").TUI,
      opts: {},
      state,
      agentNames: new Map(),
      initialSessionInput: "",
      initialSessionAgentId: null,
      resolveSessionKey: vi.fn(),
      updateHeader: vi.fn(),
      updateFooter,
      updateAutocompleteProvider,
      setActivityStatus: vi.fn(),
    });

    const first = refreshSessionInfo();
    const second = refreshSessionInfo();

    await Promise.resolve();
    expect(listSessions).toHaveBeenCalledTimes(1);

    resolveFirst?.({
      ts: Date.now(),
      path: "/tmp/sessions.json",
      count: 1,
      defaults: {},
      sessions: [
        {
          key: "agent:main:main",
          model: "old",
          modelProvider: "anthropic",
        },
      ],
    });

    await first;
    await Promise.resolve();

    expect(listSessions).toHaveBeenCalledTimes(2);

    resolveSecond?.({
      ts: Date.now(),
      path: "/tmp/sessions.json",
      count: 1,
      defaults: {},
      sessions: [
        {
          key: "agent:main:main",
          model: "Minimax-M2.1",
          modelProvider: "minimax",
        },
      ],
    });

    await second;

    expect(state.sessionInfo.model).toBe("Minimax-M2.1");
    expect(updateAutocompleteProvider).toHaveBeenCalledTimes(2);
    expect(updateFooter).toHaveBeenCalledTimes(2);
    expect(requestRender).toHaveBeenCalledTimes(2);
  });

  it("tracks loaded history message count", async () => {
    const state: TuiStateAccess = {
      agentDefaultId: "main",
      sessionMainKey: "agent:main:main",
      sessionScope: "global",
      agents: [],
      currentAgentId: "main",
      currentSessionKey: "agent:main:main",
      currentSessionId: null,
      activeChatRunId: null,
      historyLoaded: false,
      historyMessageCount: 0,
      sessionInfo: {},
      initialSessionApplied: true,
      isConnected: true,
      autoMessageSent: false,
      toolsExpanded: false,
      showThinking: false,
      connectionStatus: "connected",
      activityStatus: "idle",
      statusTimeout: null,
      lastCtrlCAt: 0,
    };

    const loadHistory = vi.fn().mockResolvedValue({
      sessionId: "s1",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    });

    const { loadHistory: runLoadHistory } = createSessionActions({
      client: {
        listSessions: vi
          .fn()
          .mockResolvedValue({ ts: Date.now(), path: "", count: 0, sessions: [] }),
        loadHistory,
      } as unknown as {
        loadHistory: typeof loadHistory;
        listSessions: (...args: unknown[]) => Promise<unknown>;
      },
      chatLog: {
        addSystem: vi.fn(),
        clearAll: vi.fn(),
        addUser: vi.fn(),
        finalizeAssistant: vi.fn(),
        startTool: vi.fn(),
      } as unknown as import("./components/chat-log.js").ChatLog,
      tui: { requestRender: vi.fn() } as unknown as import("@mariozechner/pi-tui").TUI,
      opts: {},
      state,
      agentNames: new Map(),
      initialSessionInput: "",
      initialSessionAgentId: null,
      resolveSessionKey: vi.fn(),
      updateHeader: vi.fn(),
      updateFooter: vi.fn(),
      updateAutocompleteProvider: vi.fn(),
      setActivityStatus: vi.fn(),
    });

    await runLoadHistory();
    expect(state.historyMessageCount).toBe(1);
  });
});
