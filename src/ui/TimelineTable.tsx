import type { TimelinePost } from "../types/timeline";

interface TimelineTableProps {
  posts: TimelinePost[];
  selectedPostId?: string;
  onSelectPost: (id: string) => void;
}

export function TimelineTable({ posts, selectedPostId, onSelectPost }: TimelineTableProps) {
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
            className={post.id === selectedPostId ? "selected" : undefined}
            onClick={() => onSelectPost(post.id)}
          >
            <td>
              {post.authorAvatar ? (
                <img className="avatar" src={post.authorAvatar} alt="" loading="lazy" />
              ) : (
                <div className="avatar fallback" />
              )}
            </td>
            <td className="clip">{post.authorDisplayName}</td>
            <td className="post-text">
              <span className={`kind kind-${post.kind}`}>{post.kind === "reply" ? "返信" : "投稿"}</span>
              {post.text}
            </td>
            <td>{formatDate(post.indexedAt)}</td>
            <td className="clip">@{post.authorHandle}</td>
            <td>{post.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
