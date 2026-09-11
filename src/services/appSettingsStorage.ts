import type { TimelineTab } from "../types/timeline";

const settingsKey = "bskytween.app-settings.v1";

export interface AppSettings {
  tabs: TimelineTab[];
  activeTabId: string;
  refreshIntervalSeconds: number;
  notificationsEnabled: boolean;
  showHomeReplies: boolean;
  readPostIds: string[];
}

export function loadAppSettings(): Partial<AppSettings> {
  const value = localStorage.getItem(settingsKey);
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Partial<AppSettings>;
  } catch {
    localStorage.removeItem(settingsKey);
    return {};
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}
