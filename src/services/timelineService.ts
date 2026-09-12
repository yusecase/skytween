import { SkyClient, type LoginCredentials } from "./skyClient";
import type { TimelinePost } from "../types/timeline";

export class TimelineService {
  constructor(private readonly client: SkyClient) {}

  get isAuthenticated(): boolean {
    return this.client.isAuthenticated;
  }

  login(credentials: LoginCredentials): Promise<void> {
    return this.client.login(credentials);
  }

  resumeSavedSession(): Promise<boolean> {
    return this.client.resumeSavedSession();
  }

  getHomeTimeline(): Promise<TimelinePost[]> {
    return this.client.getHomeTimeline();
  }

  searchPosts(query: string): Promise<TimelinePost[]> {
    return this.client.searchPosts(query);
  }

  getNotifications(): Promise<TimelinePost[]> {
    return this.client.getNotifications();
  }

  createPost(text: string): Promise<void> {
    return this.client.createPost(text);
  }

  toggleLike(post: TimelinePost): Promise<TimelinePost> {
    return this.client.toggleLike(post);
  }

  toggleRepost(post: TimelinePost): Promise<TimelinePost> {
    return this.client.toggleRepost(post);
  }
}

export const timelineService = new TimelineService(new SkyClient());
