import type { TimelinePost } from "../types/timeline";

interface PostDetailProps {
  post?: TimelinePost;
}

export function PostDetail({ post }: PostDetailProps) {
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
    </article>
  );
}
