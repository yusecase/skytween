import type { AtpSessionData } from "@atproto/api";

const sessionKey = "skytween.atproto.session.v1";
const legacySessionKey = "bskytween.atproto.session.v1";

export function saveSession(session: AtpSessionData | undefined): void {
  if (!session) {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(legacySessionKey);
    return;
  }

  localStorage.setItem(sessionKey, JSON.stringify(session));
  localStorage.removeItem(legacySessionKey);
}

export function loadSession(): AtpSessionData | undefined {
  const value = localStorage.getItem(sessionKey) ?? localStorage.getItem(legacySessionKey);
  if (!value) {
    return undefined;
  }

  try {
    const session = JSON.parse(value) as AtpSessionData;
    if (!localStorage.getItem(sessionKey)) {
      localStorage.setItem(sessionKey, value);
      localStorage.removeItem(legacySessionKey);
    }
    return session;
  } catch {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(legacySessionKey);
    return undefined;
  }
}
