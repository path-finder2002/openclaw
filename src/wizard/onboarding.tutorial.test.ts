import { describe, expect, it, vi } from "vitest";
import type { WizardPrompter } from "./prompts.js";
import {
  onboardingTutorialCopy,
  resolveOnboardingLocale,
  runOnboardingTutorial,
} from "./onboarding.tutorial.js";

function createPrompter(confirmValue: boolean): WizardPrompter {
  return {
    intro: vi.fn(async () => {}),
    outro: vi.fn(async () => {}),
    note: vi.fn(async () => {}),
    select: vi.fn(async () => "quickstart"),
    multiselect: vi.fn(async () => []),
    text: vi.fn(async () => ""),
    confirm: vi.fn(async () => confirmValue),
    progress: vi.fn(() => ({ update: vi.fn(), stop: vi.fn() })),
  };
}

describe("onboarding tutorial helpers", () => {
  it("resolves locale from explicit OPENCLAW_LOCALE first", () => {
    expect(resolveOnboardingLocale({ OPENCLAW_LOCALE: "ja-JP" })).toBe("ja");
    expect(resolveOnboardingLocale({ OPENCLAW_LOCALE: "en-US", LANG: "ja_JP.UTF-8" })).toBe("en");
  });

  it("falls back to ja from LANG/LC_*", () => {
    expect(resolveOnboardingLocale({ LANG: "ja_JP.UTF-8" })).toBe("ja");
    expect(resolveOnboardingLocale({ LC_MESSAGES: "ja_JP.UTF-8" })).toBe("ja");
    expect(resolveOnboardingLocale({ LC_ALL: "C" })).toBe("en");
  });

  it("shows one next command and pauses when gateway step fails", async () => {
    const copy = onboardingTutorialCopy("en");
    const prompter = createPrompter(true);

    const result = await runOnboardingTutorial({
      enabled: true,
      dashboardUrl: "http://127.0.0.1:18789",
      gatewayProbe: { ok: false, detail: "timeout" },
      apiConfigured: true,
      canAutoOpenDashboard: false,
      openDashboard: vi.fn(async () => false),
      prompter,
      copy,
    });

    expect(result.completed).toBe(false);
    expect(prompter.outro).toHaveBeenCalledWith(copy.pausedOutro);
    const notes = (prompter.note as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const failedStepText = String(notes.at(-1)?.[0] ?? "");
    expect(failedStepText).toContain("Next command:");
    expect(failedStepText).toContain("openclaw gateway status --probe");
  });

  it("pauses with auth command when API is not configured", async () => {
    const copy = onboardingTutorialCopy("ja");
    const prompter = createPrompter(true);

    const result = await runOnboardingTutorial({
      enabled: true,
      dashboardUrl: "http://127.0.0.1:18789",
      gatewayProbe: { ok: true },
      apiConfigured: false,
      canAutoOpenDashboard: false,
      openDashboard: vi.fn(async () => false),
      prompter,
      copy,
    });

    expect(result.completed).toBe(false);
    const notes = (prompter.note as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const failedStepText = String(notes.at(-1)?.[0] ?? "");
    expect(failedStepText).toContain("openclaw configure --section auth");
  });
});
