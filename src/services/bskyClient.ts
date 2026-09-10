import { Agent, CredentialSession, type AppBskyFeedDefs, type AtpSessionData } from "@atproto/api";
import { loadSession, saveSession } from "./sessionStorage";
import type { TimelineImage, TimelinePost } from "../types/timeline";

export interface LoginCredentials {
  identifier: string;
  password: string;
  service?: string;
}

export class BskyClient {
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

  private createCredentialSession(service: URL): CredentialSession {
    return new CredentialSession(service, undefined, (_event, session) => {
      saveSession(session);
    });
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
    likeCount: post.likeCount ?? 0,
    repostCount: post.repostCount ?? 0,
    replyCount: post.replyCount ?? 0,
    images: getImages(post),
  };
}

function getPostUri(post?: AppBskyFeedDefs.PostView | AppBskyFeedDefs.NotFoundPost | AppBskyFeedDefs.BlockedPost | { $type: string }): string | undefined {
  return post && "uri" in post ? post.uri : undefined;
}

function getPostText(post: AppBskyFeedDefs.PostView): string {
  const record = post.record as { text?: unknown };
  return typeof record.text === "string" ? record.text : "";
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

const now = new Date();

const sampleTimeline: TimelinePost[] = [
  {
    id: "sample:1",
    uri: "sample:1",
    cid: "sample-cid-1",
    authorDisplayName: "BskyTween Preview",
    authorHandle: "preview.local",
    text: "ログイン前のプレビューです。Blueskyの app password でログインするとHome Timelineを取得します。",
    indexedAt: now.toISOString(),
    kind: "post",
    source: "Home",
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
    likeCount: 5,
    repostCount: 1,
    replyCount: 0,
    images: [],
  },
];
