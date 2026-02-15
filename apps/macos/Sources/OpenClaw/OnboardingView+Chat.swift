import Foundation

extension OnboardingView {
    fileprivate enum OnboardingTutorialLocale {
        case ja
        case zhHans
        case other

        static func current() -> Self {
            let languageCode = Locale.current.language.languageCode?.identifier.lowercased()
            let scriptCode = Locale.current.language.script?.identifier.lowercased()
            switch languageCode {
            case "ja":
                return .ja
            case "zh" where scriptCode == "hans":
                return .zhHans
            default:
                return .other
            }
        }
    }

    fileprivate var onboardingTutorialKickoffMessage: String {
        switch OnboardingTutorialLocale.current() {
        case .ja:
            return "こんにちは！OpenClawを入れたばかりです。初回チュートリアルを、必ず日本語で1問ずつ進めてください。ゴールは4つです: 1) API設定を完了、2) 送信と返信が成功、3) スキル導入を完了、4) スキルを追加。進捗を毎回チェックして、最後に4項目の完了状況をまとめてください。"
        case .zhHans:
            return "你好！我刚安装了 OpenClaw。请用简体中文一次只问一个问题来完成首次教程。目标有四个：1）完成 API 设置；2）完成一次发送与回复；3）完成技能安装；4）再新增一个技能。每一步都检查进度，最后汇总四个目标的完成状态。"
        case .other:
            return "Hi! I just installed OpenClaw. Please run the first-run tutorial in my language, ask one question at a time, and guide me to four goals: (1) finish API setup, (2) complete one send + one reply, (3) install a skill, and (4) add another skill. After each step, track progress and finish with a 4-item completion summary."
        }
    }

    func maybeKickoffOnboardingChat(for pageIndex: Int) {
        guard pageIndex == self.onboardingChatPageIndex else { return }
        guard self.showOnboardingChat else { return }
        guard !self.didAutoKickoff else { return }
        self.didAutoKickoff = true

        Task { @MainActor in
            for _ in 0..<20 {
                if !self.onboardingChatModel.isLoading { break }
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
            guard self.onboardingChatModel.messages.isEmpty else { return }
            self.onboardingChatModel.input = self.onboardingTutorialKickoffMessage
            self.onboardingChatModel.send()
        }
    }
}
