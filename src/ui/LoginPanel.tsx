import { useState } from "react";
import { LogIn } from "lucide-react";
import { timelineService } from "../services/timelineService";

interface LoginPanelProps {
  isAuthenticated: boolean;
  onLoggedIn: () => Promise<void>;
  onStatus: (message: string) => void;
}

export function LoginPanel({ isAuthenticated, onLoggedIn, onStatus }: LoginPanelProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleLogin() {
    setIsBusy(true);
    onStatus("Blueskyへログイン中...");
    try {
      await timelineService.login({ identifier, password });
      setPassword("");
      setIsOpen(false);
      onStatus("ログインしました");
      await onLoggedIn();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setIsBusy(false);
    }
  }

  if (isAuthenticated) {
    return <span className="login-state">Logged in</span>;
  }

  return (
    <div className="login-panel">
      <button className="toolbar-button" onClick={() => setIsOpen((value) => !value)} title="ログイン">
        <LogIn size={15} />
        Login
      </button>
      {isOpen && (
        <form
          className="login-popover"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <label>
            Handle or email
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" />
          </label>
          <label>
            App password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <button className="primary-action" disabled={isBusy || !identifier || !password}>
            Login
          </button>
        </form>
      )}
    </div>
  );
}
