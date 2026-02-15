export function resolveCliFirstRunKickoff(params?: {
  platform?: NodeJS.Platform;
  locale?: string;
}): string {
  const platform = params?.platform ?? process.platform;
  const locale = (
    params?.locale ??
    Intl.DateTimeFormat().resolvedOptions().locale ??
    ""
  ).toLowerCase();

  const goalsJa =
    "ゴールは4つです: 1) API設定を完了、2) 送信と返信を完了、3) スキル導入を完了、4) スキルを追加。各ステップで進捗確認し、最後に4項目の完了状況をまとめてください。";
  const goalsEn =
    "There are four goals: (1) finish API setup, (2) complete one send and one reply, (3) install a skill, and (4) add another skill. Track progress after each step and end with a 4-item completion summary.";

  const osHintJa =
    platform === "darwin"
      ? "いまは macOS の CLI 起動です。"
      : platform === "win32"
        ? "いまは Windows の CLI 起動です。"
        : "いまは Linux の CLI 起動です。";

  const osHintEn =
    platform === "darwin"
      ? "You are running in the macOS CLI."
      : platform === "win32"
        ? "You are running in the Windows CLI."
        : "You are running in the Linux CLI.";

  if (locale.startsWith("ja")) {
    return `こんにちは！OpenClaw を入れたばかりです。初回チュートリアルを日本語で1問ずつ進めてください。${osHintJa}${goalsJa}`;
  }

  return `Hi! I just installed OpenClaw. Please run the first-run tutorial one question at a time. ${osHintEn} ${goalsEn}`;
}
