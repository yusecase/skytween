import { invoke } from "@tauri-apps/api/core";
import type { TimelinePost } from "../types/timeline";

export async function notifyNewPosts(posts: TimelinePost[], source: string): Promise<void> {
  if (posts.length === 0) {
    return;
  }

  const newest = posts[0];
  const body =
    posts.length === 1
      ? `${newest.authorDisplayName}: ${newest.text}`
      : `${posts.length}件の新着があります: ${newest.authorDisplayName}`;

  await sendNativeNotification(`BskyTween: ${source}`, body);
}

export async function sendTestNotification(): Promise<void> {
  await sendNativeNotification("BskyTween", "通知テストです");
}

async function sendNativeNotification(title: string, body: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    await invoke("send_windows_notification", { title, body });
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission === "granted") {
    new Notification(title, { body });
  }
}
