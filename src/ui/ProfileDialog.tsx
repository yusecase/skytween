import { ExternalLink, X } from "lucide-react";
import type { UserProfile } from "../types/timeline";

interface ProfileDialogProps {
  actor: string;
  profile?: UserProfile;
  isLoading: boolean;
  error?: string;
  onClose: () => void;
}

export function ProfileDialog({ actor, profile, isLoading, error, onClose }: ProfileDialogProps) {
  const profileUrl = profile ? `https://bsky.app/profile/${profile.handle}` : undefined;

  return (
    <div className="profile-backdrop" role="presentation">
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-label="ユーザー情報">
        <header className="profile-titlebar">
          <span>ユーザー情報</span>
          <button className="profile-close" type="button" onClick={onClose} title="閉じる">
            <X size={16} />
          </button>
        </header>

        <div className="profile-body">
          {isLoading && <div className="profile-message">@{actor} のプロフィールを取得中...</div>}
          {error && !isLoading && <div className="profile-message error">{error}</div>}
          {profile && !isLoading && (
            <>
              {profile.banner && <img className="profile-banner" src={profile.banner} alt="" />}
              <div className="profile-main">
                {profile.avatar ? (
                  <img className="profile-avatar" src={profile.avatar} alt="" />
                ) : (
                  <div className="profile-avatar fallback" />
                )}
                <div className="profile-summary">
                  <div className="profile-display-name">{profile.displayName}</div>
                  <div className="profile-handle">@{profile.handle}</div>
                  <div className="profile-did">{profile.did}</div>
                </div>
              </div>

              <div className="profile-relationship">
                <span>{profile.following ? "あなたはこのユーザーをフォローしています" : "まだフォローしていません"}</span>
                <span>{profile.followedBy ? "このユーザーからフォローされています" : "このユーザーからはフォローされていません"}</span>
              </div>

              <dl className="profile-stats">
                <div>
                  <dt>フォロー</dt>
                  <dd>{formatCount(profile.followsCount)}</dd>
                </div>
                <div>
                  <dt>フォロワー</dt>
                  <dd>{formatCount(profile.followersCount)}</dd>
                </div>
                <div>
                  <dt>投稿</dt>
                  <dd>{formatCount(profile.postsCount)}</dd>
                </div>
              </dl>

              <div className="profile-description">
                {profile.description || "自己紹介はまだありません"}
              </div>
            </>
          )}
        </div>

        <footer className="profile-footer">
          <button
            className="dialog-button"
            type="button"
            disabled={!profileUrl}
            onClick={() => profileUrl && window.open(profileUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink size={14} />
            Blueskyで開く
          </button>
          <button className="dialog-button primary" type="button" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}
