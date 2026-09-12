import { Heart, Repeat2 } from "lucide-react";
import type { TimelinePost } from "../types/timeline";

interface PostDetailProps {
  post?: TimelinePost;
  isActionBusy: boolean;
  onToggleLike: (post: TimelinePost) => void;
  onToggleRepost: (post: TimelinePost) => void;
}

export function PostDetail({ post, isActionBusy, onToggleLike, onToggleRepost }: PostDetailProps) {
  if (!post) {
    return <div className="empty-detail">投稿を選択してください</div>;
  }

  return (
    <article className="post-detail">
      <header>
        {post.authorAvatar && <img className="detail-avatar" src={post.authorAvatar} alt="" />}
        <div>
          <div className="detail-name">{post.authorDisplayName}</div>
          <div className="detail-meta">
            @{post.authorHandle} / {new Date(post.indexedAt).toLocaleString("ja-JP")}
          </div>
        </div>
      </header>
      {post.replyTo && <div className="relationship">返信先: {post.replyTo}</div>}
      {post.notificationReason && <div className="relationship">通知種別: {post.notificationReason}</div>}
      <p>{post.text}</p>
      {post.quoteText && <blockquote>{post.quoteText}</blockquote>}
      {post.images.length > 0 && (
        <div className="image-strip">
          {post.images.map((image) => (
            <a key={image.fullsize} href={image.fullsize} target="_blank" rel="noreferrer">
              <img src={image.thumb} alt={image.alt ?? ""} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <footer>
        <span>Reply {post.replyCount}</span>
        <span>Repost {post.repostCount}</span>
        <span>Like {post.likeCount}</span>
      </footer>
      <div className="post-actions">
        <button
          className={post.likeUri ? "post-action active" : "post-action"}
          disabled={!post.canInteract || isActionBusy}
          onClick={() => onToggleLike(post)}
          title={post.canInteract ? "いいね" : "この行はいいね対象の投稿ではありません"}
        >
          <Heart size={15} />
          {post.likeUri ? "Liked" : "Like"}
        </button>
        <button
          className={post.repostUri ? "post-action active" : "post-action"}
          disabled={!post.canInteract || isActionBusy}
          onClick={() => onToggleRepost(post)}
          title={post.canInteract ? "リポスト" : "この行はリポスト対象の投稿ではありません"}
        >
          <Repeat2 size={15} />
          {post.repostUri ? "Reposted" : "Repost"}
        </button>
      </div>
    </article>
  );
}
