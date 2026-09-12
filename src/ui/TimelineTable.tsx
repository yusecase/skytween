import type { TimelinePost } from "../types/timeline";

interface TimelineTableProps {
  posts: TimelinePost[];
  selectedPostId?: string;
  unreadPostIds: Set<string>;
  boldUnreadPosts: boolean;
  onSelectPost: (id: string) => void;
  onOpenProfile: (actor: string) => void;
}

export function TimelineTable({
  posts,
  selectedPostId,
  unreadPostIds,
  boldUnreadPosts,
  onSelectPost,
  onOpenProfile,
}: TimelineTableProps) {
  return (
    <table className="timeline-table">
      <colgroup>
        <col className="avatar-col" />
        <col className="name-col" />
        <col />
        <col className="date-col" />
        <col className="handle-col" />
        <col className="source-col" />
      </colgroup>
      <thead>
        <tr>
          <th aria-label="icon" />
          <th>Name</th>
          <th>Post text</th>
          <th>Datetime</th>
          <th>User</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr
            key={post.id}
            className={getRowClassName(post.id, selectedPostId, unreadPostIds, boldUnreadPosts)}
            onClick={() => onSelectPost(post.id)}
          >
            <td>
              <button
                className="profile-cell-button avatar-button"
                type="button"
                title={`@${post.authorHandle} のプロフィールを表示`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile(post.authorHandle);
                }}
              >
                {post.authorAvatar ? (
                  <img className="avatar" src={post.authorAvatar} alt="" loading="lazy" />
                ) : (
                  <div className="avatar fallback" />
                )}
              </button>
            </td>
            <td className="clip">
              <button
                className="profile-cell-button text-button"
                type="button"
                title={`@${post.authorHandle} のプロフィールを表示`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile(post.authorHandle);
                }}
              >
                {post.authorDisplayName}
              </button>
            </td>
            <td className="post-text">
              <span className={`kind kind-${post.kind}`}>{getKindLabel(post.kind)}</span>
              {post.text}
            </td>
            <td>{formatDate(post.indexedAt)}</td>
            <td className="clip">
              <button
                className="profile-cell-button text-button"
                type="button"
                title={`@${post.authorHandle} のプロフィールを表示`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile(post.authorHandle);
                }}
              >
                @{post.authorHandle}
              </button>
            </td>
            <td>{post.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getKindLabel(kind: TimelinePost["kind"]): string {
  switch (kind) {
    case "reply":
      return "返信";
    case "repost":
      return "RP";
    case "quote":
      return "引用";
    case "notification":
      return "通知";
    default:
      return "投稿";
  }
}

function getRowClassName(
  postId: string,
  selectedPostId: string | undefined,
  unreadPostIds: Set<string>,
  boldUnreadPosts: boolean,
): string | undefined {
  const classes = [];
  if (postId === selectedPostId) {
    classes.push("selected");
  }
  if (boldUnreadPosts && unreadPostIds.has(postId)) {
    classes.push("unread");
  }
  return classes.length > 0 ? classes.join(" ") : undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
