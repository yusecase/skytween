import { BskyClient, type LoginCredentials } from "./bskyClient";
import type { TimelinePost } from "../types/timeline";

export class TimelineService {
  constructor(private readonly client: BskyClient) {}

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

  createPost(text: string): Promise<void> {
    return this.client.createPost(text);
  }
}

export const timelineService = new TimelineService(new BskyClient());
