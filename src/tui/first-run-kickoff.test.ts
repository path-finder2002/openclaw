import { describe, expect, it } from "vitest";
import { resolveCliFirstRunKickoff } from "./first-run-kickoff.js";

describe("resolveCliFirstRunKickoff", () => {
  it("returns Japanese kickoff for ja locale on macOS", () => {
    const message = resolveCliFirstRunKickoff({ platform: "darwin", locale: "ja-JP" });
    expect(message).toContain("日本語で1問ずつ");
    expect(message).toContain("macOS");
    expect(message).toContain("ゴールは4つです");
  });

  it("returns English kickoff for non-ja locale on Windows", () => {
    const message = resolveCliFirstRunKickoff({ platform: "win32", locale: "en-US" });
    expect(message).toContain("Windows CLI");
    expect(message).toContain("There are four goals");
  });
});
