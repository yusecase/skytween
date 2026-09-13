import type { TimelinePost, TimelineTab } from "../types/timeline";

export const defaultPostRetentionLimit = 1000;

interface ParsedSearchQuery {
  apiQuery: string;
  minLikes?: number;
  textGroups: string[][];
}

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

  const parsedQuery = parseSearchQuery(tab.query ?? "");
  return posts
    .filter((post) => {
      if (post.originTabId && post.originTabId !== tab.id) {
        return false;
      }
      if (post.source !== "Search") {
        return false;
      }
      return matchesSearchQuery(post, parsedQuery);
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

export function getSearchApiQuery(rawQuery: string): string {
  return parseSearchQuery(rawQuery).apiQuery;
}

function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  const tokens = tokenizeSearchQuery(rawQuery);
  let minLikes: number | undefined;
  const apiTokens: string[] = [];
  const textGroups: string[][] = [[]];

  for (const token of tokens) {
    const minLikesMatch = token.value.match(/^min_faves:(\d+)$/i);
    if (minLikesMatch) {
      minLikes = Number(minLikesMatch[1]);
      continue;
    }

    apiTokens.push(formatSearchToken(token));
    if (/^or$/i.test(token.value)) {
      if (textGroups[textGroups.length - 1].length > 0) {
        textGroups.push([]);
      }
      continue;
    }

    textGroups[textGroups.length - 1].push(normalizeSearchText(token.value));
  }

  return {
    apiQuery: apiTokens.join(" ").trim(),
    minLikes,
    textGroups: textGroups.filter((group) => group.length > 0),
  };
}

function matchesSearchQuery(post: TimelinePost, query: ParsedSearchQuery): boolean {
  if (query.minLikes !== undefined && post.likeCount < query.minLikes) {
    return false;
  }
  if (query.textGroups.length === 0) {
    return true;
  }

  const searchableText = normalizeSearchText([post.text, post.quoteText ?? ""].join("\n"));
  return query.textGroups.some((group) => group.every((term) => searchableText.includes(term)));
}

function tokenizeSearchQuery(rawQuery: string): Array<{ value: string; quoted: boolean }> {
  const tokens: Array<{ value: string; quoted: boolean }> = [];
  let current = "";
  let quoted = false;
  let currentQuoted = false;

  for (const char of rawQuery) {
    if (char === "\"") {
      if (quoted) {
        if (current) {
          tokens.push({ value: current, quoted: true });
          current = "";
        }
        quoted = false;
        currentQuoted = false;
      } else {
        if (current.trim()) {
          tokens.push({ value: current.trim(), quoted: currentQuoted });
        }
        current = "";
        quoted = true;
        currentQuoted = true;
      }
      continue;
    }

    if (!quoted && /\s/.test(char)) {
      if (current.trim()) {
        tokens.push({ value: current.trim(), quoted: currentQuoted });
        current = "";
        currentQuoted = false;
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    tokens.push({ value: current.trim(), quoted: quoted || currentQuoted });
  }

  return tokens;
}

function formatSearchToken(token: { value: string; quoted: boolean }): string {
  if (!token.quoted && /^or$/i.test(token.value)) {
    return "OR";
  }
  return token.quoted ? `"${token.value}"` : token.value;
}

function getPostDedupeKeys(post: TimelinePost): string[] {
  return [post.id, post.uri].filter((value, index, values): value is string => (
    typeof value === "string" && value.length > 0 && values.indexOf(value) === index
  ));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}
