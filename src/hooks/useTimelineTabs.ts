import { useEffect, useRef, useState } from "react";
import type { TimelineTab } from "../types/timeline";

export const initialTabs: TimelineTab[] = [
  { id: "home", title: "Home", type: "home", notify: true },
  { id: "notifications", title: "Notifications", type: "notifications", notify: true },
];

interface CloseTabResult {
  closed: boolean;
  nextActiveTabId: string;
  wasActive: boolean;
}

export function useTimelineTabs(
  storedTabs: TimelineTab[] | undefined,
  storedActiveTabId: string | undefined,
) {
  const [tabs, setTabs] = useState<TimelineTab[]>(() => normalizeTabs(storedTabs));
  const [activeTabId, setActiveTabId] = useState(() => storedActiveTabId ?? "home");
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  function addSearchTab(query: string): string {
    const id = `search:${query}`;
    const existingTab = tabsRef.current.find((tab) => tab.id === id);
    if (!existingTab) {
      const nextTabs = [
        ...tabsRef.current,
        { id, title: `Search: ${query}`, type: "search" as const, query, notify: true },
      ];
      tabsRef.current = nextTabs;
      setTabs(nextTabs);
    }
    return id;
  }

  function closeTab(tabId: string): CloseTabResult {
    const currentTabs = tabsRef.current;
    const index = currentTabs.findIndex((tab) => tab.id === tabId);
    const tab = currentTabs[index];
    if (!tab || tab.type === "home" || tab.type === "notifications") {
      return { closed: false, nextActiveTabId: activeTabIdRef.current, wasActive: false };
    }

    const nextTabs = currentTabs.filter((currentTab) => currentTab.id !== tabId);
    const nextTab = currentTabs[index - 1] ?? currentTabs[index + 1] ?? currentTabs[0];
    const wasActive = activeTabIdRef.current === tabId;
    const nextActiveTabId = wasActive ? nextTab.id : activeTabIdRef.current;

    tabsRef.current = nextTabs;
    activeTabIdRef.current = nextActiveTabId;
    setTabs(nextTabs);
    setActiveTabId(nextActiveTabId);

    return { closed: true, nextActiveTabId, wasActive };
  }

  function switchTab(tabId: string) {
    activeTabIdRef.current = tabId;
    setActiveTabId(tabId);
  }

  function toggleTabNotification(tabId: string) {
    const nextTabs = tabsRef.current.map((tab) =>
      tab.id === tabId ? { ...tab, notify: !tab.notify } : tab,
    );
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
  }

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  return {
    tabs,
    tabsRef,
    activeTab,
    activeTabId,
    activeTabIdRef,
    addSearchTab,
    closeTab,
    switchTab,
    toggleTabNotification,
  };
}

function normalizeTabs(tabs: TimelineTab[] | undefined): TimelineTab[] {
  const nextTabs = tabs && tabs.length > 0 ? tabs : initialTabs;
  const hasHome = nextTabs.some((tab) => tab.id === "home");
  const withHome = hasHome ? nextTabs : [initialTabs[0], ...nextTabs];
  const hasNotifications = withHome.some((tab) => tab.id === "notifications");
  const withFixedTabs = hasNotifications ? withHome : [...withHome, initialTabs[1]];
  const seenTabIds = new Set<string>();
  return withFixedTabs
    .filter((tab) => {
      if (seenTabIds.has(tab.id)) {
        return false;
      }
      seenTabIds.add(tab.id);
      return true;
    })
    .map((tab) => ({
      ...tab,
      notify: tab.notify ?? true,
    }));
}
