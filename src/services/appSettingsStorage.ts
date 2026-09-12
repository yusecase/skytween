import type { TimelineTab } from "../types/timeline";

const settingsKey = "skytween.app-settings.v1";
const legacySettingsKey = "bskytween.app-settings.v1";

export interface AppSettings {
  tabs: TimelineTab[];
  activeTabId: string;
  refreshIntervalSeconds: number;
  notificationsEnabled: boolean;
  showHomeReplies: boolean;
  boldUnreadPosts: boolean;
  readPostIds: string[];
}

export function loadAppSettings(): Partial<AppSettings> {
  const value = localStorage.getItem(settingsKey) ?? localStorage.getItem(legacySettingsKey);
  if (!value) {
    return {};
  }

  try {
    const settings = JSON.parse(value) as Partial<AppSettings>;
    if (!localStorage.getItem(settingsKey)) {
      localStorage.setItem(settingsKey, value);
      localStorage.removeItem(legacySettingsKey);
    }
    return settings;
  } catch {
    localStorage.removeItem(settingsKey);
    localStorage.removeItem(legacySettingsKey);
    return {};
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
  localStorage.removeItem(legacySettingsKey);
}
