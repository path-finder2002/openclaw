import type { OpenClawConfig } from "../config/config.js";
import type { WizardPrompter } from "./prompts.js";
import { formatCliCommand } from "../cli/command-format.js";

export type OnboardingLocale = "en" | "ja";

export type OnboardingTutorialCopy = {
  tutorialTitle: string;
  tutorialIntro: string;
  tutorialGoal: string;
  apiStepOk: string;
  apiStepFailed: string;
  step1Ok: string;
  step1Failed: (detail: string) => string;
  step2Title: string;
  step2Opened: string;
  step2Manual: string;
  step2Confirm: string;
  step3Title: string;
  step3Hint: string;
  step3Confirm: string;
  step4Success: string;
  nextCommandPrefix: string;
  pausedOutro: string;
  completedOutro: string;
  channelsOptional: string;
};

export function resolveOnboardingLocale(env: NodeJS.ProcessEnv): OnboardingLocale {
  const explicit = env.OPENCLAW_LOCALE?.trim().toLowerCase();
  if (explicit?.startsWith("ja")) {
    return "ja";
  }
  if (explicit?.startsWith("en")) {
    return "en";
  }
  const localeHint = `${env.LC_ALL ?? ""} ${env.LC_MESSAGES ?? ""} ${env.LANG ?? ""}`.toLowerCase();
  return localeHint.includes("ja") ? "ja" : "en";
}

export function onboardingTutorialCopy(locale: OnboardingLocale): OnboardingTutorialCopy {
  if (locale === "ja") {
    return {
      tutorialTitle: "Onboarding tutorial",
      tutorialIntro: "初回チュートリアルを開始します。完了保証のため、順番どおりに進めます。",
      tutorialGoal: "ゴール: APIを設定して、メッセージ送信テストを完了することです。",
      apiStepOk: "API設定: OK",
      apiStepFailed: "API設定: 未完了",
      step1Ok: "1/4 Gateway確認: OK",
      step1Failed: (detail) => `1/4 Gateway確認: 失敗 (${detail})`,
      step2Title: "2/4 Dashboard起動",
      step2Opened: "起動: OK",
      step2Manual: "起動: 手動で開いてください",
      step2Confirm: "Dashboardが開けたら続行しますか？",
      step3Title: "3/4 テストメッセージ送信（1往復）",
      step3Hint: 'Dashboardでテスト送信し、返信を1回確認してください（例: "ping" → 返信）。',
      step3Confirm: "1往復のテストメッセージに成功しましたか？",
      step4Success: "4/4 成功表示: テスト完了。オンボーディングは成功です。",
      nextCommandPrefix: "次の1コマンド",
      pausedOutro: "Onboarding paused. 失敗ステップの1コマンドを実行して再開してください。",
      completedOutro: "Onboarding complete. 完了保証チュートリアルを完了しました。",
      channelsOptional: "チャンネル連携は後で追加できます（任意）",
    };
  }

  return {
    tutorialTitle: "Onboarding tutorial",
    tutorialIntro: "Starting the first-run completion tutorial. Follow each step in order.",
    tutorialGoal: "Goal: configure API access and complete a message send test.",
    apiStepOk: "API setup: OK",
    apiStepFailed: "API setup: incomplete",
    step1Ok: "1/4 Gateway check: OK",
    step1Failed: (detail) => `1/4 Gateway check: failed (${detail})`,
    step2Title: "2/4 Dashboard launch",
    step2Opened: "Launch: OK",
    step2Manual: "Launch: open it manually",
    step2Confirm: "Continue after the dashboard is open?",
    step3Title: "3/4 Test message round trip",
    step3Hint:
      'Send one test message in Dashboard and confirm one reply (example: "ping" -> reply).',
    step3Confirm: "Did the single round trip succeed?",
    step4Success: "4/4 Success: test completed. Onboarding is successful.",
    nextCommandPrefix: "Next command",
    pausedOutro:
      "Onboarding paused. Run the single next command shown for the failed step and retry.",
    completedOutro: "Onboarding complete. Completion tutorial finished.",
    channelsOptional: "Channel integration can be added later (optional)",
  };
}

export function isApiConfiguredForTutorial(
  config: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): boolean {
  const modelRaw = config.agents?.defaults?.model;
  const defaultModel =
    modelRaw &&
    typeof modelRaw === "object" &&
    "primary" in modelRaw &&
    typeof modelRaw.primary === "string"
      ? modelRaw.primary.trim()
      : "";
  if (defaultModel) {
    return true;
  }

  const envKeys = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "XAI_API_KEY",
  ] as const;
  return envKeys.some((key) => (env[key] ?? "").trim().length > 0);
}

type RunOnboardingTutorialParams = {
  enabled: boolean;
  dashboardUrl: string;
  gatewayProbe: { ok: boolean; detail?: string };
  apiConfigured: boolean;
  canAutoOpenDashboard: boolean;
  openDashboard: () => Promise<boolean>;
  prompter: WizardPrompter;
  copy: OnboardingTutorialCopy;
};

export async function runOnboardingTutorial(
  params: RunOnboardingTutorialParams,
): Promise<{ completed: boolean }> {
  if (!params.enabled) {
    return { completed: true };
  }

  const { gatewayProbe, dashboardUrl, canAutoOpenDashboard, openDashboard, prompter, copy } =
    params;

  await prompter.note([copy.tutorialIntro, copy.tutorialGoal].join("\n"), copy.tutorialTitle);

  if (!params.apiConfigured) {
    await prompter.note(
      [
        copy.apiStepFailed,
        `${copy.nextCommandPrefix}: ${formatCliCommand("openclaw configure --section auth")}`,
      ].join("\n"),
      copy.tutorialTitle,
    );
    await prompter.outro(copy.pausedOutro);
    return { completed: false };
  }
  await prompter.note(copy.apiStepOk, copy.tutorialTitle);

  if (!gatewayProbe.ok) {
    await prompter.note(
      [
        copy.step1Failed(gatewayProbe.detail ?? "gateway unreachable"),
        `${copy.nextCommandPrefix}: ${formatCliCommand("openclaw gateway status --probe")}`,
      ].join("\n"),
      copy.tutorialTitle,
    );
    await prompter.outro(copy.pausedOutro);
    return { completed: false };
  }
  await prompter.note(copy.step1Ok, copy.tutorialTitle);

  let dashboardOpened = false;
  if (canAutoOpenDashboard) {
    dashboardOpened = await openDashboard();
  }
  await prompter.note(
    [
      copy.step2Title,
      `Dashboard: ${dashboardUrl}`,
      dashboardOpened ? copy.step2Opened : copy.step2Manual,
    ].join("\n"),
    copy.tutorialTitle,
  );

  const dashboardReady = await prompter.confirm({
    message: copy.step2Confirm,
    initialValue: true,
  });
  if (!dashboardReady) {
    await prompter.note(
      `${copy.nextCommandPrefix}: ${formatCliCommand("openclaw dashboard --no-open")}`,
      copy.tutorialTitle,
    );
    await prompter.outro(copy.pausedOutro);
    return { completed: false };
  }

  await prompter.note([copy.step3Title, copy.step3Hint].join("\n"), copy.tutorialTitle);
  const roundTripOk = await prompter.confirm({
    message: copy.step3Confirm,
    initialValue: true,
  });
  if (!roundTripOk) {
    await prompter.note(
      `${copy.nextCommandPrefix}: ${formatCliCommand("openclaw doctor")}`,
      copy.tutorialTitle,
    );
    await prompter.outro(copy.pausedOutro);
    return { completed: false };
  }

  await prompter.note(copy.step4Success, copy.tutorialTitle);
  return { completed: true };
}
