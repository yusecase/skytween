import type { TimelinePost, TimelineTab } from "../types/timeline";

export const defaultPostRetentionLimit = 1000;

export function mergeTimelinePosts(
  incomingPosts: TimelinePost[],
  existingPosts: TimelinePost[],
  limit: number,
): TimelinePost[] {
  const seenKeys = new Set<string>();
  const mergedPosts = [];

  for (const post of [...incomingPosts, ...existingPosts]) {
    const keys = getPostDedupeKeys(post);
    if (keys.some((key) => seenKeys.has(key))) {
      continue;
    }
    keys.forEach((key) => seenKeys.add(key));
    mergedPosts.push(post);
  }

  return mergedPosts
    .sort((left, right) => new Date(right.indexedAt).getTime() - new Date(left.indexedAt).getTime())
    .slice(0, limit);
}

export function getDisplayPosts(
  tab: TimelineTab,
  posts: TimelinePost[],
  showHomeReplies: boolean,
): TimelinePost[] {
  if (tab.type !== "search") {
    return posts
      .filter((post) => !post.originTabId || post.originTabId === tab.id)
      .filter((post) => showHomeReplies || tab.type !== "home" || post.kind !== "reply")
      .map((post) => ({ ...post, source: tab.type === "notifications" ? "Notifications" : "Home" }));
  }

  const query = normalizeSearchText(tab.query ?? "");
  return posts
    .filter((post) => {
      if (post.originTabId && post.originTabId !== tab.id) {
        return false;
      }
      if (post.source !== "Search") {
        return false;
      }
      if (!query) {
        return true;
      }
      return normalizeSearchText(post.text).includes(query);
    })
    .map((post) => ({ ...post, source: "Search" }));
}

export function tagPostsForTab(tab: TimelineTab, posts: TimelinePost[]): TimelinePost[] {
  return posts.map((post) => ({
    ...post,
    source: tab.type === "search" ? "Search" : tab.type === "notifications" ? "Notifications" : "Home",
    originTabId: tab.id,
  }));
}

export function normalizePostRetentionLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultPostRetentionLimit;
  }
  return Math.max(50, Math.min(10000, Math.floor(value)));
}

function getPostDedupeKeys(post: TimelinePost): string[] {
  return [post.id, post.uri].filter((value, index, values): value is string => (
    typeof value === "string" && value.length > 0 && values.indexOf(value) === index
  ));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}
