import {
  Agent,
  CredentialSession,
  type AppBskyFeedDefs,
  type AppBskyNotificationListNotifications,
  type AtpSessionData,
} from "@atproto/api";
import { loadSession, saveSession } from "./sessionStorage";
import type { PostKind, TimelineImage, TimelinePost } from "../types/timeline";

export interface LoginCredentials {
  identifier: string;
  password: string;
  service?: string;
}

export class SkyClient {
  private agent: Agent | null = null;
  private session: CredentialSession | null = null;

  get isAuthenticated(): boolean {
    return this.agent !== null;
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const service = new URL(credentials.service ?? "https://bsky.social");
    const session = this.createCredentialSession(service);
    await session.login({
      identifier: credentials.identifier,
      password: credentials.password,
    });
    this.agent = new Agent(session);
    this.session = session;
  }

  async resumeSavedSession(): Promise<boolean> {
    const savedSession = loadSession();
    if (!savedSession) {
      return false;
    }

    const service = getServiceFromSession(savedSession);
    const session = this.createCredentialSession(service);
    await session.resumeSession(savedSession);
    this.agent = new Agent(session);
    this.session = session;
    return true;
  }

  async getHomeTimeline(limit = 50): Promise<TimelinePost[]> {
    if (!this.agent) {
      return sampleTimeline;
    }

    const response = await this.agent.app.bsky.feed.getTimeline({ limit });
    return response.data.feed.map((item) => mapFeedViewPost(item.post, item.reply));
  }

  async searchPosts(query: string, limit = 50): Promise<TimelinePost[]> {
    if (!query.trim()) {
      return [];
    }

    if (!this.agent) {
      return sampleTimeline
        .filter((post) => post.text.toLowerCase().includes(query.toLowerCase()))
        .map((post) => ({ ...post, source: "Search" }));
    }

    const response = await this.agent.app.bsky.feed.searchPosts({
      q: query,
      limit,
      sort: "latest",
    });
    return response.data.posts.map((post) => ({
      ...mapFeedViewPost(post),
      source: "Search",
    }));
  }

  async getNotifications(limit = 50): Promise<TimelinePost[]> {
    if (!this.agent) {
      return [];
    }

    const response = await this.agent.listNotifications({ limit });
    const subjectPosts = await this.getNotificationSubjectPosts(response.data.notifications);
    return response.data.notifications.map((notification) => mapNotification(notification, subjectPosts.get(notification.reasonSubject ?? "")));
  }

  async createPost(text: string): Promise<void> {
    if (!this.agent) {
      throw new Error("投稿するにはログインしてください");
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("投稿本文を入力してください");
    }

    await this.agent.post({
      text: trimmed,
      langs: ["ja"],
    });
  }

  async toggleLike(post: TimelinePost): Promise<TimelinePost> {
    if (!this.agent) {
      throw new Error("いいねするにはログインしてください");
    }
    if (!post.canInteract) {
      throw new Error("この行はいいね対象の投稿ではありません");
    }

    if (post.likeUri) {
      await this.agent.deleteLike(post.likeUri);
      return {
        ...post,
        likeUri: undefined,
        likeCount: Math.max(0, post.likeCount - 1),
      };
    }

    const like = await this.agent.like(post.uri, post.cid);
    return {
      ...post,
      likeUri: like.uri,
      likeCount: post.likeCount + 1,
    };
  }

  async toggleRepost(post: TimelinePost): Promise<TimelinePost> {
    if (!this.agent) {
      throw new Error("リポストするにはログインしてください");
    }
    if (!post.canInteract) {
      throw new Error("この行はリポスト対象の投稿ではありません");
    }

    if (post.repostUri) {
      await this.agent.deleteRepost(post.repostUri);
      return {
        ...post,
        repostUri: undefined,
        repostCount: Math.max(0, post.repostCount - 1),
      };
    }

    const repost = await this.agent.repost(post.uri, post.cid);
    return {
      ...post,
      repostUri: repost.uri,
      repostCount: post.repostCount + 1,
    };
  }

  private createCredentialSession(service: URL): CredentialSession {
    return new CredentialSession(service, undefined, (_event, session) => {
      saveSession(session);
    });
  }

  private async getNotificationSubjectPosts(
    notifications: AppBskyNotificationListNotifications.Notification[],
  ): Promise<Map<string, AppBskyFeedDefs.PostView>> {
    if (!this.agent) {
      return new Map();
    }

    const uris = [
      ...new Set(
        notifications
          .filter((notification) => shouldFetchNotificationSubject(notification.reason))
          .map((notification) => notification.reasonSubject)
          .filter((uri): uri is string => typeof uri === "string" && uri.length > 0),
      ),
    ];
    const posts = new Map<string, AppBskyFeedDefs.PostView>();
    for (const chunk of chunkArray(uris, 25)) {
      const response = await this.agent.getPosts({ uris: chunk });
      for (const post of response.data.posts) {
        posts.set(post.uri, post);
      }
    }
    return posts;
  }
}

function getServiceFromSession(session: AtpSessionData): URL {
  const service = "pds" in session && typeof session.pds === "string"
    ? session.pds
    : "https://bsky.social";
  return new URL(service);
}

function mapFeedViewPost(
  post: AppBskyFeedDefs.PostView,
  reply?: AppBskyFeedDefs.ReplyRef,
): TimelinePost {
  return {
    id: post.uri,
    uri: post.uri,
    cid: post.cid,
    authorDisplayName: post.author.displayName || post.author.handle,
    authorHandle: post.author.handle,
    authorAvatar: post.author.avatar,
    text: getPostText(post),
    indexedAt: post.indexedAt,
    kind: reply ? "reply" : "post",
    source: "Home",
    replyTo: getPostUri(reply?.parent),
    quoteText: getQuoteText(post),
    canInteract: true,
    likeUri: post.viewer?.like,
    repostUri: post.viewer?.repost,
    likeCount: post.likeCount ?? 0,
    repostCount: post.repostCount ?? 0,
    replyCount: post.replyCount ?? 0,
    images: getImages(post),
  };
}

function mapNotification(
  notification: AppBskyNotificationListNotifications.Notification,
  subjectPost?: AppBskyFeedDefs.PostView,
): TimelinePost {
  return {
    id: `notification:${notification.uri}:${notification.indexedAt}`,
    uri: notification.uri,
    cid: notification.cid,
    authorDisplayName: notification.author.displayName || notification.author.handle,
    authorHandle: notification.author.handle,
    authorAvatar: notification.author.avatar,
    text: getNotificationText(notification, subjectPost),
    indexedAt: notification.indexedAt,
    kind: getNotificationKind(notification.reason),
    source: "Notifications",
    notificationReason: notification.reason,
    notificationReasonSubject: notification.reasonSubject,
    canInteract: isPostNotification(notification),
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    images: subjectPost ? getImages(subjectPost) : [],
  };
}

function getPostUri(post?: AppBskyFeedDefs.PostView | AppBskyFeedDefs.NotFoundPost | AppBskyFeedDefs.BlockedPost | { $type: string }): string | undefined {
  return post && "uri" in post ? post.uri : undefined;
}

function getPostText(post: AppBskyFeedDefs.PostView): string {
  return getRecordText(post.record);
}

function getRecordText(record: { [_ in string]: unknown }): string {
  return typeof record.text === "string" ? record.text : "";
}

function getNotificationText(
  notification: AppBskyNotificationListNotifications.Notification,
  subjectPost?: AppBskyFeedDefs.PostView,
): string {
  const label = getNotificationReasonLabel(notification.reason);
  const authorName = notification.author.displayName || notification.author.handle;
  const text = getRecordText(notification.record);
  const subjectText = subjectPost ? getPostText(subjectPost) : "";
  const friendlySubject = subjectText || notification.reasonSubject || "";

  if (notification.reason === "follow") {
    return `${authorName}さんにフォローされました`;
  }
  if (notification.reason === "like" || notification.reason === "like-via-repost") {
    return friendlySubject
      ? `${authorName}さんがあなたの投稿にいいねしました: ${friendlySubject}`
      : `${authorName}さんがあなたの投稿にいいねしました`;
  }
  if (notification.reason === "repost" || notification.reason === "repost-via-repost") {
    return friendlySubject
      ? `${authorName}さんがあなたの投稿をリポストしました: ${friendlySubject}`
      : `${authorName}さんがあなたの投稿をリポストしました`;
  }
  if (text) {
    return `${authorName}さんから${label}: ${text}`;
  }
  if (friendlySubject) {
    return `${label}: ${friendlySubject}`;
  }
  return label;
}

function getNotificationKind(reason: string): PostKind {
  if (reason === "reply" || reason === "mention") {
    return "reply";
  }
  if (reason === "quote") {
    return "quote";
  }
  if (reason === "repost" || reason === "repost-via-repost") {
    return "repost";
  }
  return "notification";
}

function isPostNotification(notification: AppBskyNotificationListNotifications.Notification): boolean {
  return ["reply", "mention", "quote", "subscribed-post"].includes(notification.reason);
}

function shouldFetchNotificationSubject(reason: string): boolean {
  return ["like", "repost", "like-via-repost", "repost-via-repost"].includes(reason);
}

function getNotificationReasonLabel(reason: string): string {
  switch (reason) {
    case "like":
      return "いいね";
    case "repost":
      return "リポスト";
    case "follow":
      return "フォロー";
    case "mention":
      return "メンション";
    case "reply":
      return "返信";
    case "quote":
      return "引用";
    case "like-via-repost":
      return "リポスト経由のいいね";
    case "repost-via-repost":
      return "リポスト経由のリポスト";
    case "subscribed-post":
      return "購読投稿";
    default:
      return reason;
  }
}

function getQuoteText(post: AppBskyFeedDefs.PostView): string | undefined {
  const embed = post.embed as { record?: { value?: { text?: unknown } } } | undefined;
  const text = embed?.record?.value?.text;
  return typeof text === "string" ? text : undefined;
}

function getImages(post: AppBskyFeedDefs.PostView): TimelineImage[] {
  const embed = post.embed as { images?: Array<{ thumb: string; fullsize: string; alt?: string }> } | undefined;
  return embed?.images?.map((image) => ({
    thumb: image.thumb,
    fullsize: image.fullsize,
    alt: image.alt,
  })) ?? [];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const now = new Date();

const sampleTimeline: TimelinePost[] = [
  {
    id: "sample:1",
    uri: "sample:1",
    cid: "sample-cid-1",
    authorDisplayName: "SkyTween Preview",
    authorHandle: "preview.local",
    text: "ログイン前のプレビューです。Blueskyの app password でログインするとHome Timelineを取得します。",
    indexedAt: now.toISOString(),
    kind: "post",
    source: "Home",
    canInteract: false,
    likeCount: 12,
    repostCount: 3,
    replyCount: 2,
    images: [],
  },
  {
    id: "sample:2",
    uri: "sample:2",
    cid: "sample-cid-2",
    authorDisplayName: "OpenTween-style UI",
    authorHandle: "density.local",
    text: "投稿一覧はカードではなく表形式です。選択した投稿の全文やメタデータは下段ペインへ表示します。",
    indexedAt: new Date(now.getTime() - 1000 * 60 * 11).toISOString(),
    kind: "reply",
    source: "Home",
    replyTo: "sample:1",
    canInteract: false,
    likeCount: 5,
    repostCount: 1,
    replyCount: 0,
    images: [],
  },
];
