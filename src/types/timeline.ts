export type PostKind = "post" | "reply" | "repost" | "quote";

export interface TimelineImage {
  thumb: string;
  fullsize: string;
  alt?: string;
}

export interface TimelinePost {
  id: string;
  uri: string;
  cid: string;
  authorDisplayName: string;
  authorHandle: string;
  authorAvatar?: string;
  text: string;
  indexedAt: string;
  kind: PostKind;
  source: string;
  originTabId?: string;
  replyTo?: string;
  quoteText?: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  images: TimelineImage[];
}

export interface TimelineTab {
  id: string;
  title: string;
  type: "home" | "notifications" | "list" | "search" | "feed";
  query?: string;
  notify: boolean;
}
