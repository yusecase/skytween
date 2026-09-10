import type { AtpSessionData } from "@atproto/api";

const sessionKey = "bskytween.atproto.session.v1";

export function saveSession(session: AtpSessionData | undefined): void {
  if (!session) {
    localStorage.removeItem(sessionKey);
    return;
  }

  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function loadSession(): AtpSessionData | undefined {
  const value = localStorage.getItem(sessionKey);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as AtpSessionData;
  } catch {
    localStorage.removeItem(sessionKey);
    return undefined;
  }
}
