import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, RefreshCw, Search, Send, X } from "lucide-react";
import {
  getDisplayPosts,
  mergeTimelinePosts,
  normalizePostRetentionLimit,
  tagPostsForTab,
} from "../domain/timelineUtils";
import { useTimelineTabs } from "../hooks/useTimelineTabs";
import { timelineService } from "../services/timelineService";
import { loadAppSettings, saveAppSettings } from "../services/appSettingsStorage";
import { notifyNewPosts, sendTestNotification } from "../services/notificationService";
import type { TimelinePost, TimelineTab, UserProfile } from "../types/timeline";
import { LoginPanel } from "./LoginPanel";
import { PostDetail } from "./PostDetail";
import { ProfileDialog } from "./ProfileDialog";
import { SettingsDialog, type SettingsDraft } from "./SettingsDialog";
import { TimelineTable } from "./TimelineTable";

const buildLabel = "settings-dialog-1";
const initialSettings = loadAppSettings();

export function App() {
  const {
    tabs,
    tabsRef,
    activeTabId,
    activeTabIdRef,
    addSearchTab: addSearchTimelineTab,
    closeTab: closeTimelineTab,
    switchTab: setActiveTimelineTab,
    toggleTabNotification,
  } = useTimelineTabs(initialSettings.tabs, initialSettings.activeTabId);
  const [postsByTab, setPostsByTab] = useState<Record<string, TimelinePost[]>>({});
  const [visiblePosts, setVisiblePosts] = useState<TimelinePost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [actionPostId, setActionPostId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileActor, setProfileActor] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(timelineService.isAuthenticated);
  const [composerText, setComposerText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(initialSettings.refreshIntervalSeconds ?? 0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialSettings.notificationsEnabled ?? true);
  const [showHomeReplies, setShowHomeReplies] = useState(initialSettings.showHomeReplies ?? false);
  const [boldUnreadPosts, setBoldUnreadPosts] = useState(initialSettings.boldUnreadPosts ?? true);
  const [postRetentionLimit, setPostRetentionLimit] = useState(normalizePostRetentionLimit(initialSettings.postRetentionLimit));
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() => ({
    refreshIntervalSeconds: initialSettings.refreshIntervalSeconds ?? 0,
    notificationsEnabled: initialSettings.notificationsEnabled ?? true,
    showHomeReplies: initialSettings.showHomeReplies ?? false,
    boldUnreadPosts: initialSettings.boldUnreadPosts ?? true,
    postRetentionLimit: normalizePostRetentionLimit(initialSettings.postRetentionLimit),
  }));
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() => new Set(initialSettings.readPostIds ?? []));
  const knownPostIdsByTab = useRef(new Map<string, Set<string>>());
  const hasCompletedInitialLoadByTab = useRef(new Set<string>());
  const requestSeqByTab = useRef(new Map<string, number>());
  const postsByTabRef = useRef(postsByTab);
  const showHomeRepliesRef = useRef(showHomeReplies);
  const postRetentionLimitRef = useRef(postRetentionLimit);
  const isAutoRefreshingRef = useRef(false);
  const profileRequestSeq = useRef(0);

  const selectedPost = useMemo(
    () => visiblePosts.find((post) => post.id === selectedPostId) ?? visiblePosts[0],
    [visiblePosts, selectedPostId],
  );
  const unreadPostIds = useMemo(() => {
    const visibleIds = new Set(visiblePosts.map((post) => post.id));
    return new Set([...visibleIds].filter((id) => !readPostIds.has(id)));
  }, [readPostIds, visiblePosts]);
  const unreadCountsByTab = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of tabs) {
      counts[tab.id] = getDisplayPosts(tab, postsByTab[tab.id] ?? [], showHomeReplies).filter(
        (post) => !readPostIds.has(post.id),
      ).length;
    }
    return counts;
  }, [postsByTab, readPostIds, showHomeReplies, tabs]);

  async function refreshTab(tabId: string, options: { silent?: boolean } = {}) {
    const tab = tabsRef.current.find((currentTab) => currentTab.id === tabId);
    if (!tab) {
      return;
    }

    const seq = (requestSeqByTab.current.get(tab.id) ?? 0) + 1;
    requestSeqByTab.current.set(tab.id, seq);
    setIsLoading(true);
    if (!options.silent) {
      setStatus(`${tab.title}を取得中...`);
    }
    try {
      const nextPosts = tagPostsForTab(tab, await fetchTabPosts(tab));
      if (requestSeqByTab.current.get(tab.id) !== seq) {
        return;
      }
      const newPosts = detectNewPosts(tab.id, nextPosts);
      const mergedPosts = mergeTimelinePosts(nextPosts, postsByTabRef.current[tab.id] ?? [], postRetentionLimitRef.current);
      postsByTabRef.current = { ...postsByTabRef.current, [tab.id]: mergedPosts };
      setPostsByTab((current) => ({ ...current, [tab.id]: mergedPosts }));
      if (tab.id === activeTabIdRef.current) {
        const displayPosts = getDisplayPosts(tab, mergedPosts, showHomeRepliesRef.current);
        setVisiblePosts(displayPosts);
        setSelectedPostId((current) => current ?? displayPosts[0]?.id ?? null);
        setStatus(`${tab.title}: ${displayPosts.length}件を表示中`);
      }
      if (notificationsEnabled && tab.notify && hasCompletedInitialLoadByTab.current.has(tab.id)) {
        await notifyNewPosts(newPosts, tab.title);
      }
      hasCompletedInitialLoadByTab.current.add(tab.id);
    } catch (error) {
      if (requestSeqByTab.current.get(tab.id) === seq && tab.id === activeTabIdRef.current) {
        setStatus(error instanceof Error ? error.message : `${tab.title}の取得に失敗しました`);
      }
    } finally {
      if (requestSeqByTab.current.get(tab.id) === seq) {
        setIsLoading(false);
      }
    }
  }

  async function refreshAllTabs(options: { silent?: boolean } = {}) {
    if (isAutoRefreshingRef.current) {
      return;
    }

    isAutoRefreshingRef.current = true;
    try {
      const tabIds = tabsRef.current.map((tab) => tab.id);
      for (const tabId of tabIds) {
        await refreshTab(tabId, options);
      }
    } finally {
      isAutoRefreshingRef.current = false;
    }
  }

  async function openProfile(actor: string) {
    const trimmedActor = actor.trim();
    if (!trimmedActor) {
      return;
    }

    const seq = profileRequestSeq.current + 1;
    profileRequestSeq.current = seq;
    setProfileActor(trimmedActor);
    setProfile(undefined);
    setProfileError(undefined);
    setIsProfileLoading(true);
    try {
      const nextProfile = await timelineService.getProfile(trimmedActor);
      if (profileRequestSeq.current !== seq) {
        return;
      }
      setProfile(nextProfile);
    } catch (error) {
      if (profileRequestSeq.current !== seq) {
        return;
      }
      setProfileError(error instanceof Error ? error.message : "プロフィールの取得に失敗しました");
    } finally {
      if (profileRequestSeq.current === seq) {
        setIsProfileLoading(false);
      }
    }
  }

  function closeProfile() {
    profileRequestSeq.current += 1;
    setProfileActor(null);
    setProfile(undefined);
    setProfileError(undefined);
    setIsProfileLoading(false);
  }

  function detectNewPosts(tabId: string, nextPosts: TimelinePost[]): TimelinePost[] {
    const knownIds = knownPostIdsByTab.current.get(tabId) ?? new Set<string>();
    const newPosts = nextPosts.filter((post) => !knownIds.has(post.id));
    knownPostIdsByTab.current.set(tabId, new Set(nextPosts.map((post) => post.id)));
    return newPosts;
  }

  async function fetchTabPosts(tab: TimelineTab): Promise<TimelinePost[]> {
    if (tab.type === "search") {
      const searchedPosts = await timelineService.searchPosts(tab.query ?? "");
      return getDisplayPosts(tab, searchedPosts, showHomeRepliesRef.current);
    }
    if (tab.type === "notifications") {
      return timelineService.getNotifications();
    }
    return timelineService.getHomeTimeline();
  }

  function addSearchTab() {
    const query = searchQuery.trim();
    if (!query) {
      setStatus("検索キーワードを入力してください");
      return;
    }

    const id = addSearchTimelineTab(query);
    postsByTabRef.current = { ...postsByTabRef.current, [id]: postsByTabRef.current[id] ?? [] };
    setPostsByTab((current) => ({ ...current, [id]: current[id] ?? [] }));
    switchTab(id);
  }

  function closeTab(tabId: string) {
    const result = closeTimelineTab(tabId);
    if (!result.closed) {
      return;
    }

    setPostsByTab((current) => {
      const next = { ...current };
      delete next[tabId];
      postsByTabRef.current = next;
      return next;
    });
    knownPostIdsByTab.current.delete(tabId);
    hasCompletedInitialLoadByTab.current.delete(tabId);
    requestSeqByTab.current.delete(tabId);

    if (result.wasActive) {
      const nextTab = tabsRef.current.find((tab) => tab.id === result.nextActiveTabId);
      setSelectedPostId(null);
      setVisiblePosts(nextTab ? getDisplayPosts(nextTab, postsByTabRef.current[nextTab.id] ?? [], showHomeRepliesRef.current) : []);
    }
  }

  function switchTab(tabId: string) {
    const tab = tabsRef.current.find((currentTab) => currentTab.id === tabId);
    setActiveTimelineTab(tabId);
    setSelectedPostId(null);
    if (tab) {
      setVisiblePosts(getDisplayPosts(tab, postsByTab[tabId] ?? [], showHomeRepliesRef.current));
    } else {
      setVisiblePosts([]);
    }
    void refreshTab(tabId);
  }

  function handleSelectPost(postId: string) {
    setSelectedPostId(postId);
    markPostAsRead(postId);
  }

  function moveSelectedPost(offset: number) {
    if (visiblePosts.length === 0) {
      return;
    }

    const currentIndex = Math.max(
      0,
      visiblePosts.findIndex((post) => post.id === selectedPost?.id),
    );
    const nextIndex = Math.min(Math.max(currentIndex + offset, 0), visiblePosts.length - 1);
    const nextPost = visiblePosts[nextIndex];
    if (nextPost) {
      handleSelectPost(nextPost.id);
    }
  }

  function markPostAsRead(postId: string | undefined) {
    if (!postId) {
      return;
    }
    setReadPostIds((current) => {
      if (current.has(postId)) {
        return current;
      }
      const next = new Set(current);
      next.add(postId);
      return next;
    });
  }

  async function submitPost() {
    const text = composerText.trim();
    if (!text) {
      setStatus("投稿本文を入力してください");
      return;
    }

    setIsPosting(true);
    setStatus("投稿中...");
    try {
      await timelineService.createPost(text);
      setComposerText("");
      setStatus("投稿しました");
      await refreshTab("home");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "投稿に失敗しました");
    } finally {
      setIsPosting(false);
    }
  }

  async function toggleLike(post: TimelinePost) {
    setActionPostId(post.id);
    setStatus(post.likeUri ? "いいねを解除中..." : "いいね中...");
    try {
      const updatedPost = await timelineService.toggleLike(post);
      updatePostEverywhere(updatedPost);
      setStatus(updatedPost.likeUri ? "いいねしました" : "いいねを解除しました");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "いいね操作に失敗しました");
    } finally {
      setActionPostId(null);
    }
  }

  async function toggleRepost(post: TimelinePost) {
    setActionPostId(post.id);
    setStatus(post.repostUri ? "リポストを解除中..." : "リポスト中...");
    try {
      const updatedPost = await timelineService.toggleRepost(post);
      updatePostEverywhere(updatedPost);
      setStatus(updatedPost.repostUri ? "リポストしました" : "リポストを解除しました");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "リポスト操作に失敗しました");
    } finally {
      setActionPostId(null);
    }
  }

  function updatePostEverywhere(updatedPost: TimelinePost) {
    setPostsByTab((current) => {
      const next: Record<string, TimelinePost[]> = {};
      for (const [tabId, posts] of Object.entries(current)) {
        next[tabId] = posts.map((post) => (post.id === updatedPost.id || post.uri === updatedPost.uri ? updatedPost : post));
      }
      postsByTabRef.current = next;
      return next;
    });
    setVisiblePosts((current) => current.map((post) => (post.id === updatedPost.id || post.uri === updatedPost.uri ? updatedPost : post)));
  }

  function trimStoredPosts(limit: number) {
    setPostsByTab((current) => {
      const next: Record<string, TimelinePost[]> = {};
      for (const [tabId, posts] of Object.entries(current)) {
        next[tabId] = mergeTimelinePosts(posts, [], limit);
      }
      postsByTabRef.current = next;
      const activeTab = tabsRef.current.find((tab) => tab.id === activeTabIdRef.current);
      if (activeTab) {
        setVisiblePosts(getDisplayPosts(activeTab, next[activeTab.id] ?? [], showHomeRepliesRef.current));
      }
      return next;
    });
  }

  function openSettings() {
    setSettingsDraft({
      refreshIntervalSeconds,
      notificationsEnabled,
      showHomeReplies,
      boldUnreadPosts,
      postRetentionLimit,
    });
    setIsSettingsOpen(true);
  }

  function applySettings() {
    setRefreshIntervalSeconds(settingsDraft.refreshIntervalSeconds);
    setNotificationsEnabled(settingsDraft.notificationsEnabled);
    setShowHomeReplies(settingsDraft.showHomeReplies);
    setBoldUnreadPosts(settingsDraft.boldUnreadPosts);
    setPostRetentionLimit(settingsDraft.postRetentionLimit);
    trimStoredPosts(settingsDraft.postRetentionLimit);
    setIsSettingsOpen(false);
    setStatus("設定を保存しました");
  }

  function sendSettingsTestNotification() {
    void sendTestNotification()
      .then(() => setStatus("通知テストを送信しました"))
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : "通知テストに失敗しました");
      });
  }

  useEffect(() => {
    postsByTabRef.current = postsByTab;
  }, [postsByTab]);

  useEffect(() => {
    showHomeRepliesRef.current = showHomeReplies;
    postRetentionLimitRef.current = postRetentionLimit;
    const tab = tabsRef.current.find((currentTab) => currentTab.id === activeTabIdRef.current);
    if (tab) {
      setVisiblePosts(getDisplayPosts(tab, postsByTab[tab.id] ?? [], showHomeReplies));
    }
  }, [activeTabId, postRetentionLimit, postsByTab, showHomeReplies]);

  useEffect(() => {
    markPostAsRead(selectedPost?.id);
  }, [selectedPost?.id]);

  useEffect(() => {
    const selectedRow = document.querySelector<HTMLTableRowElement>(".timeline-table tbody tr.selected");
    selectedRow?.scrollIntoView({ block: "nearest" });
  }, [activeTabId, selectedPost?.id]);

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      moveSelectedPost(event.key === "ArrowUp" ? -1 : 1);
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [selectedPost?.id, visiblePosts]);

  useEffect(() => {
    saveAppSettings({
      tabs,
      activeTabId,
      refreshIntervalSeconds,
      notificationsEnabled,
      showHomeReplies,
      boldUnreadPosts,
      postRetentionLimit,
      readPostIds: [...readPostIds].slice(-2500),
    });
  }, [activeTabId, boldUnreadPosts, notificationsEnabled, postRetentionLimit, readPostIds, refreshIntervalSeconds, showHomeReplies, tabs]);

  useEffect(() => {
    const initialTabId = tabsRef.current.some((tab) => tab.id === activeTabIdRef.current) ? activeTabIdRef.current : "home";
    setActiveTimelineTab(initialTabId);
    void refreshTab(initialTabId);
  }, []);

  useEffect(() => {
    async function resume() {
      try {
        const resumed = await timelineService.resumeSavedSession();
        setIsAuthenticated(timelineService.isAuthenticated);
        if (resumed) {
          setStatus("保存済みセッションでログインしました");
          await refreshTab("home");
        }
      } catch {
        setIsAuthenticated(false);
        setStatus("保存済みセッションの復元に失敗しました。再ログインしてください");
      }
    }

    void resume();
  }, []);

  useEffect(() => {
    if (refreshIntervalSeconds === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshAllTabs({ silent: true });
    }, refreshIntervalSeconds * 1000);

    return () => window.clearInterval(intervalId);
  }, [refreshIntervalSeconds, notificationsEnabled]);

  return (
    <div className="app-shell">
      <header className="menu-bar">
        <div className="brand">SkyTween <span>{buildLabel}</span></div>
        <button className="toolbar-button" onClick={() => void refreshTab(activeTabId)} disabled={isLoading} title="更新">
          <RefreshCw size={15} />
          更新
        </button>
        <form
          className="search-box"
          onSubmit={(event) => {
            event.preventDefault();
            addSearchTab();
          }}
        >
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Public Search"
          />
          <button className="toolbar-button" title="検索タブを追加">
            <Search size={15} />
            検索
          </button>
        </form>
        <button
          className="toolbar-button icon-only"
          onClick={() => setNotificationsEnabled((value) => !value)}
          title={notificationsEnabled ? "新着通知: ON" : "新着通知: OFF"}
        >
          {notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
        <button className="toolbar-button" onClick={openSettings} title="設定">
          設定
        </button>
        <div className="menu-spacer" />
        <LoginPanel
          isAuthenticated={isAuthenticated}
          onStatus={setStatus}
          onLoggedIn={async () => {
            setIsAuthenticated(timelineService.isAuthenticated);
            await refreshTab(activeTabId);
          }}
        />
      </header>

      <main className="workspace">
        <section className="timeline-pane" aria-label="投稿一覧">
          <TimelineTable
            key={activeTabId}
            posts={visiblePosts}
            selectedPostId={selectedPost?.id}
            unreadPostIds={unreadPostIds}
            boldUnreadPosts={boldUnreadPosts}
            onSelectPost={handleSelectPost}
            onOpenProfile={(actor) => void openProfile(actor)}
          />
        </section>

        <nav className="tab-bar" aria-label="タイムラインタブ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTabId ? "tab active" : "tab"}
              type="button"
              onClick={() => switchTab(tab.id)}
            >
              <span className="tab-title">{tab.title}</span>
              {(unreadCountsByTab[tab.id] ?? 0) > 0 && (
                <span className="tab-unread-count">{unreadCountsByTab[tab.id]}</span>
              )}
              <span
                className={tab.notify ? "tab-notify enabled" : "tab-notify"}
                role="button"
                tabIndex={0}
                title={tab.notify ? "このタブの新着通知: ON" : "このタブの新着通知: OFF"}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleTabNotification(tab.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleTabNotification(tab.id);
                  }
                }}
              >
                {tab.notify ? <Bell size={12} /> : <BellOff size={12} />}
              </span>
              {tab.type !== "home" && (
                <span
                  className="tab-close"
                  role="button"
                  tabIndex={0}
                  title="タブを閉じる"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      closeTab(tab.id);
                    }
                  }}
                >
                  <X size={13} />
                </span>
              )}
            </button>
          ))}
          <button className="tab muted" disabled>
            Custom Feed
          </button>
        </nav>

        <section className="detail-pane" aria-label="選択中投稿の詳細">
          <PostDetail
            post={selectedPost}
            isActionBusy={actionPostId === selectedPost?.id}
            onToggleLike={(post) => void toggleLike(post)}
            onToggleRepost={(post) => void toggleRepost(post)}
          />
        </section>
      </main>

      <footer className="composer">
        <textarea
          value={composerText}
          onChange={(event) => setComposerText(event.target.value)}
          placeholder="投稿本文"
          rows={2}
        />
        <button
          className="post-button"
          disabled={isPosting || !isAuthenticated || !composerText.trim()}
          title="Post"
          onClick={() => void submitPost()}
        >
          <Send size={16} />
          Post
        </button>
      </footer>

      <div className="status-bar">{status}</div>
      {isSettingsOpen && (
        <SettingsDialog
          draft={settingsDraft}
          onChange={setSettingsDraft}
          onCancel={() => setIsSettingsOpen(false)}
          onOk={applySettings}
          onSendTestNotification={sendSettingsTestNotification}
        />
      )}
      {profileActor && (
        <ProfileDialog
          actor={profileActor}
          profile={profile}
          isLoading={isProfileLoading}
          error={profileError}
          onClose={closeProfile}
        />
      )}
    </div>
  );
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, button"));
}
