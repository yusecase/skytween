import { Bell, Eye, RotateCw, Settings } from "lucide-react";

export interface SettingsDraft {
  refreshIntervalSeconds: number;
  notificationsEnabled: boolean;
  showHomeReplies: boolean;
  boldUnreadPosts: boolean;
}

interface SettingsDialogProps {
  draft: SettingsDraft;
  onChange: (draft: SettingsDraft) => void;
  onCancel: () => void;
  onOk: () => void;
  onSendTestNotification: () => void;
}

const sections = [
  { id: "basic", title: "基本", children: [{ id: "refresh", title: "更新間隔" }] },
  { id: "display", title: "表示", children: [{ id: "timeline", title: "発言一覧" }] },
  { id: "notification", title: "通知", children: [{ id: "notify", title: "通知" }] },
  { id: "account", title: "アカウント", children: [{ id: "login", title: "ログイン" }] },
] as const;

export function SettingsDialog({
  draft,
  onChange,
  onCancel,
  onOk,
  onSendTestNotification,
}: SettingsDialogProps) {
  function updateDraft(nextDraft: Partial<SettingsDraft>) {
    onChange({ ...draft, ...nextDraft });
  }

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="設定">
        <header className="settings-titlebar">
          <Settings size={16} />
          <span>設定</span>
          <button className="settings-close" onClick={onCancel} title="閉じる">x</button>
        </header>
        <div className="settings-body">
          <nav className="settings-tree" aria-label="設定カテゴリ">
            {sections.map((section) => (
              <div key={section.id} className="settings-tree-section">
                <div className="settings-tree-heading">{section.title}</div>
                {section.children.map((child) => (
                  <button key={child.id} className="settings-tree-item" type="button">
                    {child.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="settings-pages">
            <section className="settings-page">
              <h2><RotateCw size={16} /> 更新間隔</h2>
              <label className="settings-row">
                <span>自動更新間隔</span>
                <span className="settings-inline-field">
                  <input
                    type="number"
                    min={0}
                    max={86400}
                    step={1}
                    value={draft.refreshIntervalSeconds}
                    onChange={(event) => updateDraft({ refreshIntervalSeconds: normalizeSeconds(event.target.value) })}
                  />
                  秒
                </span>
              </label>
              <p className="settings-help">0 秒にすると自動更新しません。例: 180 で 3 分ごとに更新します。</p>
            </section>

            <section className="settings-page">
              <h2><Eye size={16} /> 発言一覧</h2>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={draft.showHomeReplies}
                  onChange={(event) => updateDraft({ showHomeReplies: event.target.checked })}
                />
                Homeでフォロー中アカウントのリプライを表示する
              </label>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={draft.boldUnreadPosts}
                  onChange={(event) => updateDraft({ boldUnreadPosts: event.target.checked })}
                />
                未読ポストを太字で表示する
              </label>
            </section>

            <section className="settings-page">
              <h2><Bell size={16} /> 通知</h2>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={draft.notificationsEnabled}
                  onChange={(event) => updateDraft({ notificationsEnabled: event.target.checked })}
                />
                Windows通知を有効にする
              </label>
              <button className="toolbar-button" type="button" onClick={onSendTestNotification}>
                通知テスト
              </button>
            </section>
          </div>
        </div>
        <footer className="settings-footer">
          <button className="toolbar-button" onClick={onOk}>OK</button>
          <button className="toolbar-button" onClick={onCancel}>キャンセル</button>
        </footer>
      </section>
    </div>
  );
}

function normalizeSeconds(value: string): number {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return 0;
  }
  return Math.max(0, Math.min(86400, Math.floor(nextValue)));
}
